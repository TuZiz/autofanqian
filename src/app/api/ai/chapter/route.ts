import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildChapterSystemPrompt, buildChapterUserPrompt } from "@/lib/ai/chapter-prompt";
import { extractChapterDraftFromText } from "@/lib/ai/chapter-draft";
import {
  beginChapterGenerationLock,
  endChapterGenerationLock,
} from "@/lib/ai/chapter-generation-lock";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getProviderApiKeyEnvName,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import { prisma } from "@/lib/prisma";
import type { StoryOutline } from "@/lib/create/outline-draft";
import {
  getEffectivePlannedUntil,
  isChapterWithinPlanning,
} from "@/lib/create/progressive-planning";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
});

const chapterTitleSchema = z.string().trim().min(1).max(120);
const chapterContentSchema = z.string().trim().min(1).max(200_000);

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function getDefaultChapterTitle(index: number) {
  if (index === 1) return "第一章";
  return `第${index}章`;
}

function findBlockingPreviousChapter(
  chapters: Array<{ index: number; content: string; wordCount: number }>,
) {
  return chapters
    .filter((chapter) => chapter.index > 0)
    .filter((chapter) => chapter.wordCount <= 0 || !chapter.content.trim())
    .sort((left, right) => right.index - left.index)[0];
}

function clampText(value: string | null | undefined, maxChars: number) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "未登录或登录已失效，请先登录。" },
      { status: 401 },
    );
  }

  const raw = await request.json().catch(() => null as unknown);
  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, message: "请求参数校验失败，请检查输入内容。" },
      { status: 400 },
    );
  }

  const body = parsedBody.data;

  const isAdmin = isAdminUser(user);

  try {
    const work = await prisma.work.findUnique({
      where: { id: body.workId },
      select: {
        id: true,
        userId: true,
        genreId: true,
        genreLabel: true,
        idea: true,
        tags: true,
        platformLabel: true,
        words: true,
        dnaBookTitle: true,
        tag: true,
        title: true,
        synopsis: true,
        outline: true,
        targetChapters: true,
        plannedUntilChapter: true,
        deletedAt: true,
      },
    });

    if (!work || work.deletedAt) {
      return NextResponse.json(
        { success: false, message: "作品不存在或已被删除。" },
        { status: 404 },
      );
    }

    if (!isAdmin && work.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: "无权限访问该作品。" },
        { status: 403 },
      );
    }

    const outline = work.outline as unknown as StoryOutline;
    const plannedUntilChapter = getEffectivePlannedUntil({
      outline,
      plannedUntilChapter: work.plannedUntilChapter,
    });

    if (
      !isChapterWithinPlanning({
        index: body.index,
        outline,
        plannedUntilChapter,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `第${body.index}章尚未规划，当前只开放到第${plannedUntilChapter}章。请先在作品页点击“规划下一段”。`,
        },
        { status: 423 },
      );
    }

    let previousChapters: Array<{
      index: number;
      title: string | null;
      content: string;
      wordCount: number;
      summary: string | null;
    }> = [];
    if (body.index > 1) {
      previousChapters = await prisma.chapter.findMany({
        where: {
          workId: work.id,
          index: { lt: body.index },
          deletedAt: null,
        },
        orderBy: { index: "asc" },
        select: {
          index: true,
          title: true,
          content: true,
          wordCount: true,
          summary: true,
        },
      });
      const blockingPreviousChapter = findBlockingPreviousChapter(previousChapters);

      if (blockingPreviousChapter) {
        return NextResponse.json(
          {
            success: false,
            message: `请先完成第${blockingPreviousChapter.index}章正文后，再生成第${body.index}章。`,
          },
          { status: 422 },
        );
      }
    }

    const existingChapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: body.index } },
      select: { id: true, title: true, content: true, wordCount: true, deletedAt: true },
    });

    if (existingChapter?.deletedAt) {
      return NextResponse.json(
        { success: false, message: "章节已删除，请先恢复后再生成。" },
        { status: 410 },
      );
    }

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = existingChapter?.content?.trim()
      ? aiModelConfig.regenerateAll
      : aiModelConfig.chapterGenerate;

    const providers = buildAiProviderChain({
      providers: providersFromEnv,
      preferredProviderId: target.providerId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      const envKey = getProviderApiKeyEnvName(target.providerId);
      return NextResponse.json(
        {
          success: false,
          message:
            `AI 未配置：当前“生成第一章”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
        },
        { status: 500 },
      );
    }

    const primaryProvider = providers[0];

    const generationLock = beginChapterGenerationLock({
      userId: user.id,
      workId: work.id,
      index: body.index,
    });

    if (!generationLock.acquired) {
      return NextResponse.json(
        { success: false, message: "该章节正在生成中，请等待生成结束后再操作。" },
        { status: 409 },
      );
    }

    try {
      const previousChapter = previousChapters
        .slice()
        .sort((left, right) => right.index - left.index)[0];
      const recentSummaries = previousChapters
        .slice()
        .filter((chapter) => chapter.summary?.trim() || chapter.content.trim())
        .sort((left, right) => right.index - left.index)
        .slice(0, 5)
        .map((chapter) => ({
          index: chapter.index,
          title: chapter.title,
          summary: clampText(chapter.summary || chapter.content, 600),
        }))
        .reverse();
      const writingMemories = await prisma.writingMemory.findMany({
        where: { novelId: work.id, isActive: true },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 12,
        select: { content: true },
      });
      const [characters, worldSettings, timelineEvents, foreshadowings] =
        await Promise.all([
          prisma.character.findMany({
            where: { novelId: work.id, deletedAt: null },
            orderBy: [{ lastChapter: "desc" }, { updatedAt: "desc" }],
            take: 12,
            select: {
              name: true,
              role: true,
              identity: true,
              currentState: true,
              goal: true,
              desc: true,
            },
          }),
          prisma.worldSetting.findMany({
            where: { novelId: work.id, deletedAt: null },
            orderBy: [{ lastUpdatedChapter: "desc" }, { updatedAt: "desc" }],
            take: 12,
            select: { kind: true, name: true, desc: true },
          }),
          prisma.timelineEvent.findMany({
            where: {
              novelId: work.id,
              deletedAt: null,
              chapterIndex: { lt: body.index },
            },
            orderBy: [{ chapterIndex: "desc" }, { order: "desc" }],
            take: 8,
            select: { title: true, summary: true, storyTime: true, chapterIndex: true },
          }),
          prisma.foreshadowing.findMany({
            where: {
              novelId: work.id,
              deletedAt: null,
              status: { in: ["open", "partial"] },
            },
            orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
            take: 10,
            select: {
              title: true,
              hint: true,
              payoff: true,
              status: true,
              plantedChapter: true,
              importance: true,
            },
          }),
        ]);
      const userPrompt = buildChapterUserPrompt({
        chapterIndex: body.index,
        work: {
          genreId: work.genreId,
          genreLabel: work.genreLabel,
          tags: work.tags ?? [],
          platformLabel: work.platformLabel,
          words: work.words,
          dnaBookTitle: work.dnaBookTitle,
          idea: work.idea,
          title: work.title,
          synopsis: work.synopsis,
        },
        outline,
        context: {
          previousSummary: previousChapter?.summary ?? null,
          previousEnding: clampText(previousChapter?.content, 900),
          recentSummaries,
          writingMemories: writingMemories.map((item) => item.content),
          characters: characters.map((item) =>
            clampText(
              `${item.name}（${item.role || item.identity || "角色"}）：${item.currentState || item.goal || item.desc}`,
              360,
            ),
          ),
          worldSettings: worldSettings.map((item) =>
            clampText(`${item.kind}/${item.name}：${item.desc}`, 360),
          ),
          timelineEvents: timelineEvents.map((item) =>
            clampText(
              `${item.chapterIndex ? `第${item.chapterIndex}章 ` : ""}${item.storyTime ? `${item.storyTime} ` : ""}${item.title || item.summary}：${item.summary}`,
              360,
            ),
          ),
          foreshadowings: foreshadowings.map((item) =>
            clampText(
              `${item.title || "伏笔"}（${item.status}，重要度${item.importance}）：${item.hint}${item.payoff ? `；兑现方向：${item.payoff}` : ""}`,
              360,
            ),
          ),
        },
        extraPrompt: body.extraPrompt,
      });
      const generationJob = await prisma.generationJob.create({
        data: {
          novelId: work.id,
          chapterId: existingChapter?.id ?? null,
          action: existingChapter?.content?.trim() ? "regenerate.all" : "chapter.generate",
          status: "running",
          providerId: primaryProvider.id,
          modelUsed: providers[0]?.model ?? null,
          promptTemplateKey: existingChapter?.content?.trim()
            ? "regenerate.all"
            : "chapter.generate",
          promptSnapshot: userPrompt.slice(0, 20000),
        },
      });

      const result = await callAiText({
        providers,
        preferredProviderId: primaryProvider.id,
        messages: [
          { role: "system", content: buildChapterSystemPrompt() },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.85,
        maxTokens: 5200,
      });

      await logAiUsage({
        userId: user.id,
        action: `chapter_generate_${body.index}`,
        result,
      });

      if (!result.ok || !result.text) {
        await prisma.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: "failed",
            error: result.upstreamMessage || "AI 生成失败",
            providerId: result.providerId ?? primaryProvider.id,
            modelUsed: result.modelUsed ?? providers[0]?.model ?? null,
            inputTokens: result.usage?.inputTokens ?? null,
            outputTokens: result.usage?.outputTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            durationMs: result.durationMs ?? null,
            completedAt: new Date(),
          },
        });
        return NextResponse.json(
          { success: false, message: getReadableAiErrorMessage(result, aiZhCN.chapterGenerate.failed) },
          { status: 502 },
        );
      }

      const extractedDraft = extractChapterDraftFromText(result.text);

      const titleCandidate =
        typeof extractedDraft?.title === "string" ? extractedDraft.title.trim() : "";
      const contentCandidate =
        typeof extractedDraft?.content === "string" ? extractedDraft.content.trim() : "";

      const titleInput =
        titleCandidate.length > 120 ? titleCandidate.slice(0, 120) : titleCandidate;
      const contentInput =
        contentCandidate.length > 200_000
          ? contentCandidate.slice(0, 200_000)
          : contentCandidate;

      const titleParsed = chapterTitleSchema.safeParse(titleInput);
      const title = titleParsed.success
        ? titleParsed.data
        : getDefaultChapterTitle(body.index);

      const contentParsed = chapterContentSchema.safeParse(contentInput);
      const content = contentParsed.success ? contentParsed.data : result.text.trim();

      if (existingChapter?.content?.trim()) {
        try {
          await createChapterRevisionSnapshot({
            workId: work.id,
            index: body.index,
            source: "ai_regenerate",
          });
        } catch (revisionError) {
          console.error("create chapter revision failed", revisionError);
        }
      }

      const chapter = await prisma.chapter.upsert({
        where: { workId_index: { workId: work.id, index: body.index } },
        create: {
          workId: work.id,
          index: body.index,
          title,
          content,
          wordCount: countWords(content),
          status: "written",
          details: [],
        },
        update: {
          title,
          content,
          wordCount: countWords(content),
          status: "written",
        },
        select: {
          id: true,
          index: true,
          title: true,
          content: true,
          wordCount: true,
          summary: true,
          chapterOutline: true,
          details: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          chapterId: chapter.id,
          status: "success",
          providerId: result.providerId ?? primaryProvider.id,
          modelUsed: result.modelUsed ?? providers[0]?.model ?? null,
          resultSummary: `已生成第${body.index}章，${countWords(content)}字。`,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          completedAt: new Date(),
        },
      });

      await prisma.generationJob.create({
        data: {
          novelId: work.id,
          chapterId: chapter.id,
          action: "context.extract",
          status: "queued",
          resultSummary: "章节生成后等待后台提取上下文记忆。",
        },
      });

      return NextResponse.json({
        success: true,
        message: "OK",
        data: {
          work: {
            id: work.id,
            title: work.title,
            tag: work.tag,
          },
          chapter: {
            ...chapter,
            createdAt: chapter.createdAt.toISOString(),
            updatedAt: chapter.updatedAt.toISOString(),
            details: chapter.details ?? [],
          },
        },
      });
    } finally {
      endChapterGenerationLock(generationLock.key);
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        },
        { status: 500 },
      );
    }

    if (error instanceof AuthApiError) {
      return NextResponse.json(
        { success: false, message: error.message, fieldErrors: error.fieldErrors },
        { status: error.status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试。" },
      { status: 500 },
    );
  }
}

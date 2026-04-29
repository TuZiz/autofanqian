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
import { callAiText, getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { isAdminEmail } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import type { StoryOutline } from "@/lib/create/outline-draft";

export const runtime = "nodejs";

const bodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(999),
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

  const isAdmin = isAdminEmail(user.email);

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
      },
    });

    if (!work) {
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

    if (body.index > 1) {
      const previousChapters = await prisma.chapter.findMany({
        where: {
          workId: work.id,
          index: { lt: body.index },
        },
        select: {
          index: true,
          content: true,
          wordCount: true,
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
      select: { content: true },
    });

    const providersFromEnv = getAiProvidersFromEnv();
    const aiModelConfig = await getAiModelConfig();
    const target = existingChapter?.content?.trim()
      ? aiModelConfig.regenerateAll
      : aiModelConfig.chapterGenerate;

    const selectedProvider = providersFromEnv.find(
      (provider) => provider.id === target.providerId,
    );

    if (!selectedProvider) {
      const envKey = target.providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
      return NextResponse.json(
        {
          success: false,
          message:
            `AI 未配置：当前“生成第一章”使用 ${target.providerId}，但未检测到 ${envKey}。请在 web/.env 或 web/.env.local 中配置后重启，或到后台“AI 模型配置”切换线路。`,
        },
        { status: 500 },
      );
    }

    const providers = [
      {
        ...selectedProvider,
        model: target.model ?? selectedProvider.model,
      },
    ];

    const outline = work.outline as unknown as StoryOutline;
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
      const result = await callAiText({
        providers,
        preferredProviderId: selectedProvider.id,
        messages: [
          { role: "system", content: buildChapterSystemPrompt() },
          {
            role: "user",
            content: buildChapterUserPrompt({
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
              extraPrompt: body.extraPrompt,
            }),
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
        return NextResponse.json(
          { success: false, message: result.upstreamMessage || "AI 生成失败，请稍后重试。" },
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

      const chapter = await prisma.chapter.upsert({
        where: { workId_index: { workId: work.id, index: body.index } },
        create: {
          workId: work.id,
          index: body.index,
          title,
          content,
          wordCount: countWords(content),
          details: [],
        },
        update: {
          title,
          content,
          wordCount: countWords(content),
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

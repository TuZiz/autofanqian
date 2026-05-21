import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  assertAiQuotaAvailable,
  runWithAiQuotaReservation,
} from "@/lib/ai/quota";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { errorResponse, parseJsonBody } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import { assertCanUseAiAction } from "@/lib/membership/guards";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { requireWorkAccess } from "@/lib/works/access";
import {
  chapterConsistencyRequestSchema,
  chapterConsistencyResultSchema,
  type ChapterConsistencyResult,
} from "@/shared/schemas/chapter-consistency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function formatJson(value: unknown, limit = 6000) {
  if (value == null) return "无";
  try {
    return JSON.stringify(value).slice(0, limit);
  } catch {
    return String(value).slice(0, limit);
  }
}

function buildConsistencyPrompt(params: {
  work: {
    title: string;
    workType: string;
    tag: string;
    outline: unknown;
    canonState: unknown;
  };
  chapter: {
    title: string | null;
    content: string;
    summary: string | null;
    chapterOutline: string | null;
    details: unknown;
  };
  previousSummaries: Array<{ index: number; title: string | null; summary: string | null }>;
  characters: Array<{ name: string; role: string; desc: string; currentState: string | null }>;
  memories: Array<{ kind: string; priority: number; content: string }>;
  timelineEvents: Array<{ chapterIndex: number | null; title: string | null; summary: string }>;
}) {
  const characterBlock = params.characters.length
    ? params.characters
        .map(
          (item) =>
            `- ${item.name}（${item.role}）：${item.desc}${item.currentState ? `；当前状态：${item.currentState}` : ""}`,
        )
        .join("\n")
    : "无";
  const memoryBlock = params.memories.length
    ? params.memories
        .map((item) => `- [${item.kind}/${item.priority}] ${item.content}`)
        .join("\n")
    : "无";
  const timelineBlock = params.timelineEvents.length
    ? params.timelineEvents
        .map((item) => `- 第${item.chapterIndex ?? "?"}章 ${item.title ?? ""}：${item.summary}`)
        .join("\n")
    : "无";
  const previousBlock = params.previousSummaries.length
    ? params.previousSummaries
        .map((item) => `- 第${item.index}章 ${item.title ?? ""}：${item.summary ?? "无摘要"}`)
        .join("\n")
    : "无";

  return [
    "请对当前章节做系统性一致性检查，只输出严格 JSON，不要 Markdown，不要解释。",
    "检查维度：角色矛盾、时间线矛盾、设定冲突、剧情断裂、风格偏移、强约束遗漏。",
    '输出格式：{"score":0-100,"issues":[{"severity":"low|medium|high","type":"character|timeline|setting|plot|style|other","title":"问题标题","description":"具体问题","suggestion":"修改建议"}]}',
    "如果没有明显问题，issues 输出空数组，score 给 85-100。",
    "",
    `作品：${params.work.title}`,
    `类型：${params.work.workType}`,
    `题材：${params.work.tag}`,
    `作品大纲：${formatJson(params.work.outline)}`,
    `CanonState：${formatJson(params.work.canonState)}`,
    "",
    "角色档案：",
    characterBlock.slice(0, 5000),
    "",
    "写作记忆：",
    memoryBlock.slice(0, 5000),
    "",
    "时间线：",
    timelineBlock.slice(0, 5000),
    "",
    "前 3 章摘要：",
    previousBlock.slice(0, 3000),
    "",
    `当前章节标题：${params.chapter.title || "未命名章节"}`,
    `当前章节摘要：${params.chapter.summary || "无"}`,
    `当前章节大纲：${params.chapter.chapterOutline || "无"}`,
    `当前章节细节：${formatJson(params.chapter.details, 2000)}`,
    "",
    "当前章节正文：",
    params.chapter.content.slice(0, 22000),
  ].join("\n");
}

function parseConsistencyResult(text: string): ChapterConsistencyResult | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const parsed = chapterConsistencyResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    score: Math.round(parsed.data.score),
    issues: parsed.data.issues,
  };
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const body = await parseJsonBody(request, chapterConsistencyRequestSchema);
    const { user, work } = await requireWorkAccess(body.workId);
    const chapterIndex = body.chapterIndex;
    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: chapterIndex } },
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
        chapterOutline: true,
        details: true,
        deletedAt: true,
      },
    });

    if (!chapter || chapter.deletedAt) {
      throw new AuthApiError(404, "章节不存在或已被删除。");
    }
    if (!chapter.content.trim()) {
      throw new AuthApiError(422, "当前章节正文为空，无法进行一致性检查。");
    }

    const [fullWork, previousSummaries, characters, memories, timelineEvents] =
      await Promise.all([
        prisma.work.findUnique({
          where: { id: work.id },
          select: {
            title: true,
            workType: true,
            tag: true,
            outline: true,
            canonState: true,
          },
        }),
        prisma.chapter.findMany({
          where: {
            workId: work.id,
            deletedAt: null,
            index: { lt: chapterIndex },
            summary: { not: null },
          },
          orderBy: { index: "desc" },
          take: 3,
          select: { index: true, title: true, summary: true },
        }),
        prisma.character.findMany({
          where: { novelId: work.id, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: { name: true, role: true, desc: true, currentState: true },
        }),
        prisma.writingMemory.findMany({
          where: { novelId: work.id, isActive: true },
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
          take: 20,
          select: { kind: true, priority: true, content: true },
        }),
        prisma.timelineEvent.findMany({
          where: { novelId: work.id, deletedAt: null },
          orderBy: [{ chapterIndex: "desc" }, { order: "desc" }],
          take: 24,
          select: { chapterIndex: true, title: true, summary: true },
        }),
      ]);

    if (!fullWork) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    await assertAiQuotaAvailable(user);
    await assertCanUseAiAction(user, "chapter_consistency_check");

    const aiModelConfig = await getAiModelConfig();
    const target = aiModelConfig.chapterRewrite;
    const routeId = target.providerId;
    const providers = buildAiProviderChain({
      providers: getAiProvidersFromEnv(),
      preferredProviderId: routeId,
      overrideModel: target.model,
    });

    if (!providers.length) {
      throw new AuthApiError(500, "AI 未配置，请先在后台配置可用模型。");
    }

    const primaryProvider = providers[0];
    const prompt = buildConsistencyPrompt({
      work: fullWork,
      chapter,
      previousSummaries: previousSummaries.slice().reverse(),
      characters,
      memories,
      timelineEvents,
    });

    const generationJob = await prisma.generationJob.create({
      data: {
        novelId: work.id,
        userId: user.id,
        workId: work.id,
        chapterId: chapter.id,
        chapterIndex,
        action: "chapter.consistency_check",
        jobType: "chapter.consistency",
        status: "running",
        routeId,
        providerId: primaryProvider.id,
        modelUsed: primaryProvider.model,
        promptTemplateKey: "chapter.consistency",
        promptSnapshot: prompt.slice(0, 20000),
        startedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });

    const result = await runWithAiQuotaReservation(
      user,
      "chapter_consistency_check",
      () =>
        callAiText({
          providers,
          routeId,
          preferredProviderId: primaryProvider.id,
          messages: [
            {
              role: "system",
              content: "你是中文小说连续性审校编辑，只返回可解析的一致性检查 JSON。",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          maxTokens: 2600,
          attempts: 1,
          reasoningEffort: "low",
        }),
      {
        estimatedTokens: 2600,
        estimatedOutputChars: 4000,
      },
    );

    const parsed = result.ok && result.text ? parseConsistencyResult(result.text) : null;
    if (!parsed) {
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: {
          status: "failed",
          routeId,
          error: result.upstreamMessage || "consistency_parse_failed",
          errorMessage: "AI 一致性检查结果解析失败。",
          providerId: result.providerId ?? primaryProvider.id,
          modelUsed: result.modelUsed ?? primaryProvider.model,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          finishedAt: new Date(),
          heartbeatAt: new Date(),
          completedAt: new Date(),
        },
      });
      throw new AuthApiError(
        502,
        getReadableAiErrorMessage(result, "AI 一致性检查结果解析失败，请稍后重试。"),
      );
    }

    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        status: "succeeded",
        routeId,
        resultSummary: `一致性检查完成，score=${parsed.score}，issues=${parsed.issues.length}`,
        resultJson: parsed as Prisma.InputJsonValue,
        providerId: result.providerId ?? primaryProvider.id,
        modelUsed: result.modelUsed ?? primaryProvider.model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        durationMs: result.durationMs ?? null,
        finishedAt: new Date(),
        heartbeatAt: new Date(),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "一致性检查已完成。",
      data: parsed,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据表尚未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

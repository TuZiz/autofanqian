import "server-only";

import { after } from "next/server";

import { logAiUsage } from "@/lib/ai/usage-log";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import { runCanonAiCompression } from "@/lib/ai/novel-canon-ai-compression";
import {
  buildAiProviderChain,
  callAiText,
  getAiProvidersFromEnv,
  getReadableAiErrorMessage,
} from "@/lib/ai/upstream-text";
import { getAiModelConfig } from "@/lib/config/ai-model";
import { prisma } from "@/lib/prisma";
import { AI_ACTIONS } from "@/shared/ai-actions";
import { isShortStoryWork } from "@/shared/work-type";
import {
  parseContextExtractionResponse,
  summarizeContextExtractionResult,
} from "./chapter-context-extract-parser";
import {
  buildContextExtractSystemPrompt,
  buildContextExtractUserPrompt,
  MAX_PROMPT_CHARS,
} from "./chapter-context-extract-prompt";
import { applyContextExtractionPayload } from "./chapter-context-extract-persistence";
import type { QueueChapterContextExtractionParams } from "./chapter-context-extract-types";

const pendingContextExtractionKeys = new Set<string>();
const recentContextExtractionQueuedAt = new Map<string, number>();
const SAVE_TRIGGER_THROTTLE_MS = 5 * 60 * 1000;

function getContextExtractionKey(params: {
  workId: string;
  chapterId: string;
  index: number;
}) {
  return `${params.workId}:${params.chapterId}:${params.index}`;
}

async function processChapterContextExtraction(params: QueueChapterContextExtractionParams) {
  const [chapter, work, characters, memories, timelineEvents, foreshadowings] =
    await Promise.all([
      prisma.chapter.findUnique({
        where: { id: params.chapterId },
        select: {
          id: true,
          workId: true,
          index: true,
          title: true,
          content: true,
          summary: true,
          chapterOutline: true,
          details: true,
        },
      }),
      prisma.work.findUnique({
        where: { id: params.workId },
        select: {
          id: true,
          title: true,
          tag: true,
          synopsis: true,
          workType: true,
        },
      }),
      prisma.character.findMany({
        where: { novelId: params.workId, deletedAt: null },
        orderBy: [{ updatedAt: "desc" }],
        take: 16,
        select: {
          id: true,
          name: true,
          aliases: true,
          role: true,
          currentState: true,
          goal: true,
          desc: true,
        },
      }),
      prisma.writingMemory.findMany({
        where: { novelId: params.workId, isActive: true },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 12,
        select: { kind: true, content: true },
      }),
      prisma.timelineEvent.findMany({
        where: {
          novelId: params.workId,
          deletedAt: null,
          chapterIndex: { lt: params.index },
        },
        orderBy: [{ chapterIndex: "desc" }, { order: "desc" }],
        take: 6,
        select: { chapterIndex: true, title: true, summary: true },
      }),
      prisma.foreshadowing.findMany({
        where: {
          novelId: params.workId,
          deletedAt: null,
          status: { in: ["open", "partial"] },
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 8,
        select: {
          plantedChapter: true,
          title: true,
          hint: true,
          payoff: true,
          status: true,
        },
      }),
    ]);

  if (!chapter || chapter.workId !== params.workId) return;
  if (!work) return;
  if (!chapter.content.trim()) return;

  const providersFromEnv = await getAiProvidersFromEnv();
  const aiModelConfig = await getAiModelConfig();
  const target = aiModelConfig.chapterDetails;
  const routeId = target.providerId;
  const providers = buildAiProviderChain({
    providers: providersFromEnv,
    preferredProviderId: routeId,
    overrideModel: target.model,
  });

  if (!providers.length) {
    return;
  }

  const systemPrompt = buildContextExtractSystemPrompt();
  const userPrompt = buildContextExtractUserPrompt({
    work,
    chapter,
    index: params.index,
    characters,
    memories,
    timelineEvents,
    foreshadowings,
  });
  const contextExtractMaxTokens = getChapterTokenConfig({
    mode: isShortStoryWork(work.workType) ? "short" : "long",
  }).contextExtract;

  const pendingJob = await prisma.generationJob.findFirst({
    where: {
      novelId: params.workId,
      chapterId: params.chapterId,
      ...(params.generationJobId ? { id: { not: params.generationJobId } } : {}),
      action: { in: [AI_ACTIONS.bibleExtract, "context.extract"] },
      status: { in: ["queued", "running"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  if (pendingJob?.status === "running") {
    return;
  }

  const generationJob = params.generationJobId
    ? await prisma.generationJob.update({
        where: { id: params.generationJobId },
        data: {
          status: "running",
          userId: params.user.id,
          workId: params.workId,
          chapterId: params.chapterId,
          chapterIndex: params.index,
          action: AI_ACTIONS.bibleExtract,
          jobType: "bible.extract",
          routeId,
          providerId: providers[0]?.id ?? null,
          modelUsed: providers[0]?.model ?? null,
          promptTemplateKey: AI_ACTIONS.bibleExtract,
          promptSnapshot: userPrompt.slice(0, MAX_PROMPT_CHARS),
          startedAt: new Date(),
          heartbeatAt: new Date(),
        },
        select: { id: true },
      })
    : pendingJob
    ? await prisma.generationJob.update({
        where: { id: pendingJob.id },
        data: {
          status: "running",
          userId: params.user.id,
          workId: params.workId,
          chapterIndex: params.index,
          action: AI_ACTIONS.bibleExtract,
          jobType: "bible.extract",
          routeId,
          providerId: providers[0]?.id ?? null,
          modelUsed: providers[0]?.model ?? null,
          promptTemplateKey: AI_ACTIONS.bibleExtract,
          promptSnapshot: userPrompt.slice(0, MAX_PROMPT_CHARS),
          startedAt: new Date(),
          heartbeatAt: new Date(),
        },
        select: { id: true },
      })
    : await prisma.generationJob.create({
        data: {
          userId: params.user.id,
          novelId: params.workId,
          workId: params.workId,
          chapterId: params.chapterId,
          chapterIndex: params.index,
          action: AI_ACTIONS.bibleExtract,
          jobType: "bible.extract",
          status: "running",
          routeId,
          providerId: providers[0]?.id ?? null,
          modelUsed: providers[0]?.model ?? null,
          promptTemplateKey: AI_ACTIONS.bibleExtract,
          promptSnapshot: userPrompt.slice(0, MAX_PROMPT_CHARS),
          startedAt: new Date(),
          heartbeatAt: new Date(),
        },
        select: { id: true },
      });

  let result = await callAiText({
    providers,
    routeId,
    preferredProviderId: providers[0]?.id,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.25,
    maxTokens: contextExtractMaxTokens,
    attempts: 2,
  });

  await logAiUsage({
    userId: params.user.id,
    action: AI_ACTIONS.bibleExtract,
    result,
  });

  let payload =
    result.ok && result.text
      ? await parseContextExtractionResponse(result.text)
      : null;

  if (result.ok && result.text && !payload) {
    const retry = await callAiText({
      providers,
      routeId,
      preferredProviderId: result.providerId ?? providers[0]?.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        { role: "assistant", content: result.text },
        {
          role: "user",
          content: "上一条输出不是合法 JSON。请严格只输出符合 schema 的 JSON 对象，不要任何额外文字。",
        },
      ],
      temperature: 0.15,
      maxTokens: contextExtractMaxTokens,
      attempts: 1,
    });

    await logAiUsage({
      userId: params.user.id,
      action: AI_ACTIONS.bibleExtract,
      result: retry,
    });

    if (retry.ok && retry.text) {
      result = retry;
      payload = await parseContextExtractionResponse(retry.text);
    }
  }

  if (!result.ok || !result.text || !payload) {
    await prisma.generationJob.update({
      where: { id: generationJob.id },
      data: {
        status: "failed",
        routeId,
        error: getReadableAiErrorMessage(result, "上下文提取失败"),
        errorMessage: getReadableAiErrorMessage(result, "上下文提取失败"),
        providerId: result.providerId ?? providers[0]?.id ?? null,
        modelUsed: result.modelUsed ?? providers[0]?.model ?? null,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        durationMs: result.durationMs ?? null,
        finishedAt: new Date(),
        heartbeatAt: new Date(),
        completedAt: new Date(),
      },
    });
    return;
  }

  await applyContextExtractionPayload({
    chapter,
    characters,
    index: params.index,
    payload,
    workId: params.workId,
  });

  const updatedWork = await prisma.work.findUnique({
    where: { id: params.workId },
    select: { canonState: true, workType: true },
  });
  if (updatedWork) {
    await runCanonAiCompression({
      workId: params.workId,
      userId: params.user.id,
      current: updatedWork.canonState,
      mode: isShortStoryWork(updatedWork.workType) ? "short" : "long",
      providers,
      routeId,
      preferredProviderId: result.providerId ?? providers[0]?.id,
    });
  }

  await prisma.generationJob.update({
    where: { id: generationJob.id },
    data: {
      status: "succeeded",
      routeId,
      providerId: result.providerId ?? providers[0]?.id ?? null,
      modelUsed: result.modelUsed ?? providers[0]?.model ?? null,
      resultSummary: summarizeContextExtractionResult(payload),
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      totalTokens: result.usage?.totalTokens ?? null,
      durationMs: result.durationMs ?? null,
      finishedAt: new Date(),
      heartbeatAt: new Date(),
      completedAt: new Date(),
    },
  });
}

function beginChapterContextExtraction(params: QueueChapterContextExtractionParams) {
  const key = getContextExtractionKey(params);
  if (pendingContextExtractionKeys.has(key)) {
    return null;
  }

  const now = Date.now();
  const lastQueuedAt = recentContextExtractionQueuedAt.get(key) ?? 0;
  if (!params.force && now - lastQueuedAt < SAVE_TRIGGER_THROTTLE_MS) {
    return null;
  }

  pendingContextExtractionKeys.add(key);
  recentContextExtractionQueuedAt.set(key, now);
  return key;
}

async function runChapterContextExtractionInternal(
  key: string,
  params: QueueChapterContextExtractionParams,
) {
  try {
    await processChapterContextExtraction(params);
  } catch (error) {
    console.error("chapter context extraction failed", error);
  } finally {
    pendingContextExtractionKeys.delete(key);
  }

  return true;
}

export async function runChapterContextExtraction(
  params: QueueChapterContextExtractionParams,
) {
  const key = beginChapterContextExtraction(params);
  if (!key) return false;
  await runChapterContextExtractionInternal(key, params);
  return true;
}

export function queueChapterContextExtraction(params: QueueChapterContextExtractionParams) {
  const key = beginChapterContextExtraction(params);
  if (!key) return false;

  after(async () => {
    await runChapterContextExtractionInternal(key, params);
  });

  return true;
}

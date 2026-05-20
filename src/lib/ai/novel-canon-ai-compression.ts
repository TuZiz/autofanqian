import "server-only";

import { z } from "zod";

import { compressNovelCanonState } from "@/lib/ai/novel-canon-compression";
import {
  normalizeNovelCanonState,
  type NovelCanonState,
  type NovelMode,
} from "@/lib/ai/novel-canon-state";
import { callAiText, type UpstreamProvider, type UpstreamRouteId } from "@/lib/ai/upstream-text";
import { prisma } from "@/lib/prisma";

const aiCompressedLongSchema = z
  .object({
    mainPlot: z.string().trim().default(""),
    currentVolume: z.string().trim().default(""),
    characterStates: z.array(z.string().trim().min(1)).max(120).default([]),
    worldRules: z.array(z.string().trim().min(1)).max(80).default([]),
    openForeshadowings: z.array(z.string().trim().min(1)).max(50).default([]),
    forbiddenContradictions: z.array(z.string().trim().min(1)).max(80).default([]),
  })
  .strict();

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

function isCanonAiCompressionEnabled() {
  return process.env.AI_ENABLE_CANON_AI_COMPRESSION?.trim().toLowerCase() === "true";
}

export function shouldRunCanonAiCompression(state: NovelCanonState) {
  return (
    isCanonAiCompressionEnabled() &&
    state.mode === "long" &&
    (state.long.volumeSummaries.length > 100 || state.long.characterStates.length > 150)
  );
}

function buildCanonCompressionPrompt(state: NovelCanonState) {
  return [
    "请压缩长篇小说 canonState，只保留稳定、可复用、无重复的核心事实。",
    "不要新增设定，不要编造剧情，只基于输入合并去重。",
    "",
    JSON.stringify(state.long).slice(0, 18000),
    "",
    '只输出 JSON：{"mainPlot":"","currentVolume":"","characterStates":[],"worldRules":[],"openForeshadowings":[],"forbiddenContradictions":[]}',
  ].join("\n");
}

export async function runCanonAiCompression(params: {
  workId: string;
  userId?: string | null;
  current: unknown;
  mode: NovelMode;
  providers: UpstreamProvider[];
  routeId: UpstreamRouteId;
  preferredProviderId?: string | null;
}) {
  const state = normalizeNovelCanonState(params.current, params.mode);
  if (!shouldRunCanonAiCompression(state) || !params.providers.length) return null;

  const prompt = buildCanonCompressionPrompt(state);
  const job = await prisma.generationJob
    .create({
      data: {
        userId: params.userId ?? null,
        novelId: params.workId,
        workId: params.workId,
        action: "canon.compress",
        jobType: "canon.compress",
        status: "running",
        routeId: params.routeId,
        providerId: params.preferredProviderId ?? params.providers[0]?.id ?? null,
        modelUsed: params.providers[0]?.model ?? null,
        promptTemplateKey: "canon.compress",
        promptSnapshot: prompt.slice(0, 20000),
        startedAt: new Date(),
        heartbeatAt: new Date(),
      },
      select: { id: true },
    })
    .catch(() => null);

  try {
    const result = await callAiText({
      providers: params.providers,
      routeId: params.routeId,
      preferredProviderId: params.preferredProviderId,
      messages: [
        {
          role: "system",
          content:
            "你是长篇小说 canonState 压缩器。只输出压缩 JSON，不要解释，不要输出正文。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      maxTokens: 1800,
      attempts: 1,
      reasoningEffort: "low",
    });
    const raw = result.ok && result.text ? extractJson(result.text) : null;
    const parsed = raw ? aiCompressedLongSchema.safeParse(raw) : null;
    if (!parsed?.success) {
      if (job?.id) {
        await prisma.generationJob
          .update({
            where: { id: job.id },
            data: {
            status: "failed",
            error: result.upstreamMessage ?? "canon_ai_compression_parse_failed",
            errorMessage: result.upstreamMessage ?? "canon_ai_compression_parse_failed",
            providerId: result.providerId ?? params.preferredProviderId ?? null,
            modelUsed: result.modelUsed ?? params.providers[0]?.model ?? null,
            inputTokens: result.usage?.inputTokens ?? null,
            outputTokens: result.usage?.outputTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            durationMs: result.durationMs ?? null,
            finishedAt: new Date(),
            completedAt: new Date(),
            heartbeatAt: new Date(),
          },
          })
          .catch(() => undefined);
      }
      return null;
    }

    const compressed = compressNovelCanonState({
      ...state,
      long: {
        ...state.long,
        ...parsed.data,
        resolvedForeshadowings: state.long.resolvedForeshadowings,
        relationships: state.long.relationships,
      },
    });
    await prisma.work.update({
      where: { id: params.workId },
      data: { canonState: compressed },
    });
    if (job?.id) {
      await prisma.generationJob
        .update({
          where: { id: job.id },
          data: {
          status: "succeeded",
          resultSummary: "canonState AI 压缩完成",
          providerId: result.providerId ?? params.preferredProviderId ?? null,
          modelUsed: result.modelUsed ?? params.providers[0]?.model ?? null,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          durationMs: result.durationMs ?? null,
          finishedAt: new Date(),
          completedAt: new Date(),
          heartbeatAt: new Date(),
        },
        })
        .catch(() => undefined);
    }
    return compressed;
  } catch (error) {
    if (job?.id) {
      await prisma.generationJob
        .update({
          where: { id: job.id },
          data: {
          status: "failed",
          error: error instanceof Error ? error.message : "canon_ai_compression_failed",
          errorMessage: error instanceof Error ? error.message : "canon_ai_compression_failed",
          resultSummary: "canonState AI 压缩失败，已跳过",
          finishedAt: new Date(),
          completedAt: new Date(),
          heartbeatAt: new Date(),
        },
        })
        .catch(() => undefined);
    }
    return null;
  }
}

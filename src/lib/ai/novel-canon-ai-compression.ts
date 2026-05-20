import "server-only";

import { z } from "zod";

import {
  beginAiStepJob,
  completeAiStepJob,
  failAiStepJob,
} from "@/lib/ai/ai-step-job";
import {
  isAuxiliaryTimeoutError,
  withAuxiliaryTimeoutSignal,
} from "@/lib/ai/chapter-auxiliary-timeout";
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
  const job = await beginAiStepJob({
    userId: params.userId ?? null,
    workId: params.workId,
    action: "canon.compress",
    routeId: params.routeId,
    providerId: params.preferredProviderId ?? params.providers[0]?.id ?? null,
    modelUsed: params.providers[0]?.model ?? null,
    promptSnapshot: prompt,
  });

  try {
    const result = await withAuxiliaryTimeoutSignal("canon_compress", (signal) =>
      callAiText({
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
        signal,
      }),
    );
    const raw = result.ok && result.text ? extractJson(result.text) : null;
    const parsed = raw ? aiCompressedLongSchema.safeParse(raw) : null;
    if (!parsed?.success) {
      await failAiStepJob({
        jobId: job?.id,
        result,
        error: result.upstreamMessage ?? "canon_ai_compression_parse_failed",
        resultSummary: "canonState AI 压缩失败，已跳过",
        providerId: params.preferredProviderId,
        modelUsed: params.providers[0]?.model ?? null,
      });
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
    await completeAiStepJob({
      jobId: job?.id,
      result,
      resultJson: {
        before: {
          volumeSummaries: state.long.volumeSummaries.length,
          characterStates: state.long.characterStates.length,
          worldRules: state.long.worldRules.length,
          openForeshadowings: state.long.openForeshadowings.length,
          forbiddenContradictions: state.long.forbiddenContradictions.length,
        },
        after: {
          volumeSummaries: compressed.long.volumeSummaries.length,
          characterStates: compressed.long.characterStates.length,
          worldRules: compressed.long.worldRules.length,
          openForeshadowings: compressed.long.openForeshadowings.length,
          forbiddenContradictions: compressed.long.forbiddenContradictions.length,
        },
      },
      resultSummary: "canonState AI 压缩完成",
      providerId: params.preferredProviderId,
      modelUsed: params.providers[0]?.model ?? null,
    });
    return compressed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "canon_ai_compression_failed";
    await failAiStepJob({
      jobId: job?.id,
      error: message,
      resultSummary: isAuxiliaryTimeoutError(error, "canon_compress")
        ? "canonState AI 压缩超时，已跳过"
        : "canonState AI 压缩失败，已跳过",
      providerId: params.preferredProviderId,
      modelUsed: params.providers[0]?.model ?? null,
    });
    return null;
  }
}

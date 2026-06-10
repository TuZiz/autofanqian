import "server-only";

import { z } from "zod";

import {
  beginAiStepJob,
  completeAiStepJob,
  failAiStepJob,
} from "@/lib/ai/chapter-ai-step-job";
import { getChapterAuxiliaryFlags } from "@/lib/ai/chapter-auxiliary-flags";
import { withAuxiliaryTimeoutSignal } from "@/lib/ai/chapter-auxiliary-timeout";
import type { ChapterAuxiliaryAiCallRunner, ChapterPlan } from "@/lib/ai/chapter-plan";
import {
  buildChapterQualitySystemPrompt,
  buildChapterQualityUserPrompt,
} from "@/lib/ai/chapter-quality-prompt";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import {
  callAiText,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import type { NovelMode } from "@/lib/ai/novel-canon-state";

export type ChapterQualityCheckResult = {
  score: number;
  rhythm: number;
  hook: number;
  emotion: number;
  conflict: number;
  issues: string[];
  suggestions: string[];
};

type QualityCallText = (params: {
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}) => Promise<Pick<UpstreamTextResult, "ok" | "text" | "upstreamMessage">>;

const scoreSchema = z.coerce.number().min(0).max(100).default(0);
const qualitySchema = z
  .object({
    score: scoreSchema,
    rhythm: scoreSchema,
    hook: scoreSchema,
    emotion: scoreSchema,
    conflict: scoreSchema,
    issues: z.array(z.string().trim().min(1)).max(12).default([]),
    suggestions: z.array(z.string().trim().min(1)).max(12).default([]),
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

export function parseChapterQualityCheck(text: string): ChapterQualityCheckResult | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const parsed = qualitySchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    issues: parsed.data.issues.map((item) => item.trim()).filter(Boolean),
    suggestions: parsed.data.suggestions.map((item) => item.trim()).filter(Boolean),
  };
}

export async function runChapterQualityCheck(params: {
  mode: NovelMode;
  userId?: string | null;
  workId?: string | null;
  chapterId?: string | null;
  chapterIndex?: number | null;
  title: string;
  content: string;
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
  providers?: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  callText?: QualityCallText;
  runAiCall?: ChapterAuxiliaryAiCallRunner;
  user?: {
    email: string;
    role?: string | null;
    membershipTier?: string | null;
  } | null;
}): Promise<ChapterQualityCheckResult | null> {
  const flags = getChapterAuxiliaryFlags(params.user);
  if (!flags.qualityCheck) {
    return null;
  }
  const callText =
    params.callText ??
    (async ({ messages, temperature, maxTokens, signal }) => {
      if (!params.providers?.length) return { ok: false, upstreamMessage: "no_provider" };
      return callAiText({
        providers: params.providers,
        routeId: params.routeId,
        preferredProviderId: params.preferredProviderId,
        messages,
        temperature,
        maxTokens,
        attempts: 1,
        reasoningEffort: "low",
        signal,
      });
    });
  const tokenConfig = getChapterTokenConfig({ mode: params.mode });
  const messages: UpstreamChatMessage[] = [
    { role: "system", content: buildChapterQualitySystemPrompt() },
    { role: "user", content: buildChapterQualityUserPrompt(params) },
  ];
  const stepJob =
    params.userId && params.workId
      ? await beginAiStepJob({
          userId: params.userId,
          workId: params.workId,
          chapterId: params.chapterId ?? null,
          chapterIndex: params.chapterIndex ?? null,
          action: "chapter.quality_check",
          routeId: params.routeId,
          providerId: params.preferredProviderId,
          modelUsed: params.providers?.[0]?.model ?? null,
          promptSnapshot: messages.map((message) => message.content).join("\n\n"),
        })
      : null;

  try {
    const executeQualityCall = (signal: AbortSignal) =>
      callText({
        messages,
        temperature: 0.15,
        maxTokens: Math.min(tokenConfig.consistencyCheck, 1200),
        signal,
      }) as Promise<UpstreamTextResult>;
    const result = params.runAiCall
      ? await params.runAiCall("chapter_quality_check", () =>
          withAuxiliaryTimeoutSignal("chapter_quality_check", executeQualityCall),
        )
      : await withAuxiliaryTimeoutSignal("chapter_quality_check", executeQualityCall);
    let finalResult = result;
    let quality = result.ok && result.text ? parseChapterQualityCheck(result.text) : null;
    if (!quality && result.ok && result.text) {
      const retryMessages: UpstreamChatMessage[] = [
        ...messages,
        {
          role: "user",
          content:
            '上一条输出不是可解析 JSON。请只输出严格 JSON：{"score":0-100,"rhythm":0-100,"hook":0-100,"emotion":0-100,"conflict":0-100,"issues":[],"suggestions":[]}',
        },
      ];
      const executeRetryQualityCall = (signal: AbortSignal) =>
        callText({
          messages: retryMessages,
          temperature: 0,
          maxTokens: Math.min(tokenConfig.consistencyCheck, 1200),
          signal,
        }) as Promise<UpstreamTextResult>;
      finalResult = params.runAiCall
        ? await params.runAiCall("chapter_quality_check", () =>
            withAuxiliaryTimeoutSignal("chapter_quality_check", executeRetryQualityCall),
          )
        : await withAuxiliaryTimeoutSignal("chapter_quality_check", executeRetryQualityCall);
      quality =
        finalResult.ok && finalResult.text
          ? parseChapterQualityCheck(finalResult.text)
          : null;
    }
    if (!quality) {
      await failAiStepJob({
        jobId: stepJob?.id,
        result: finalResult as UpstreamTextResult,
        error: finalResult.upstreamMessage ?? "chapter_quality_check_failed",
        resultSummary: "章节质量评分失败，已降级跳过",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
      return null;
    }

    await completeAiStepJob({
      jobId: stepJob?.id,
      result: finalResult as UpstreamTextResult,
      resultJson: quality,
      resultSummary: `章节质量评分完成，score=${quality.score} JSON=${JSON.stringify({
        issues: quality.issues,
        suggestions: quality.suggestions,
        rhythm: quality.rhythm,
        hook: quality.hook,
        emotion: quality.emotion,
        conflict: quality.conflict,
      })}`,
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    return quality;
  } catch (error) {
    const quotaInsufficient = error instanceof AuthApiError && error.status === 429;
    await failAiStepJob({
      jobId: stepJob?.id,
      error: error instanceof Error ? error.message : "chapter_quality_check_exception",
      resultSummary: quotaInsufficient
        ? "额度不足，跳过质量评分"
        : "章节质量评分异常，已降级跳过",
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    return null;
  }
}

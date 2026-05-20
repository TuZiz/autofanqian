import "server-only";

import { z } from "zod";

import {
  beginAiStepJob,
  completeAiStepJob,
  failAiStepJob,
} from "@/lib/ai/chapter-ai-step-job";
import type { ChapterAuxiliaryAiCallRunner, ChapterPlan } from "@/lib/ai/chapter-plan";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import {
  callAiText,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
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

function buildQualityPrompt(params: {
  mode: NovelMode;
  title: string;
  content: string;
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
}) {
  return [
    "你是中文小说章节质量评估编辑，只输出严格 JSON。",
    "请从爽点节奏、结尾钩子、情绪推进、冲突强度四个角度评分。",
    "不要改写正文，不要输出 Markdown。",
    `模式：${params.mode}`,
    params.generationPlan ? `ChapterPlan：${JSON.stringify(params.generationPlan)}` : "",
    "",
    "关键上下文：",
    params.assembledContext.slice(0, 6000),
    "",
    `标题：${params.title}`,
    "正文：",
    params.content.slice(0, 16000),
    "",
    '输出 JSON：{"score":0-100,"rhythm":0-100,"hook":0-100,"emotion":0-100,"conflict":0-100,"issues":[],"suggestions":[]}',
  ]
    .filter(Boolean)
    .join("\n");
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
}): Promise<ChapterQualityCheckResult | null> {
  const callText =
    params.callText ??
    (async ({ messages, temperature, maxTokens }) => {
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
      });
    });
  const tokenConfig = getChapterTokenConfig({ mode: params.mode });
  const messages: UpstreamChatMessage[] = [
    {
      role: "system",
      content:
        '你是中文小说章节质量评分器。只输出 {"score","rhythm","hook","emotion","conflict","issues","suggestions"} JSON。',
    },
    { role: "user", content: buildQualityPrompt(params) },
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
    const executeQualityCall = () =>
      callText({
        messages,
        temperature: 0.15,
        maxTokens: Math.min(tokenConfig.consistencyCheck, 1200),
      }) as Promise<UpstreamTextResult>;
    const result = params.runAiCall
      ? await params.runAiCall("chapter_quality_check", executeQualityCall)
      : await executeQualityCall();
    const quality = result.ok && result.text ? parseChapterQualityCheck(result.text) : null;
    if (!quality) {
      await failAiStepJob({
        jobId: stepJob?.id,
        result: result as UpstreamTextResult,
        error: result.upstreamMessage ?? "chapter_quality_check_failed",
        resultSummary: "章节质量评分失败，已降级跳过",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
      return null;
    }

    await completeAiStepJob({
      jobId: stepJob?.id,
      result: result as UpstreamTextResult,
      resultSummary: `章节质量评分完成，score=${quality.score}`,
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    return quality;
  } catch (error) {
    await failAiStepJob({
      jobId: stepJob?.id,
      error: error instanceof Error ? error.message : "chapter_quality_check_exception",
      resultSummary: "章节质量评分异常，已降级跳过",
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    return null;
  }
}

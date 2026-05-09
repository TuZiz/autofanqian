import { buildChapterSystemPrompt } from "@/lib/ai/chapter-prompt";
import {
  callAiText,
  getReadableAiErrorMessage,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamProviderId,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import {
  countWords,
  finalizeGeneratedDraft,
  getDefaultChapterTitle,
} from "@/lib/ai/chapter-generate-shared";

export type ChapterLengthPolicy = {
  min: number;
  max: number;
  target: number;
};

export type ChapterLengthRepairOutcome = {
  draft: {
    title: string;
    content: string;
  };
  wordCount: number;
  policy: ChapterLengthPolicy;
  repairAttempted: boolean;
  repairApplied: boolean;
  repairResult?: UpstreamTextResult;
  repairNote?: string;
};

const DEFAULT_TARGET_WORDS = 3200;
const MIN_TARGET_WORDS = 3200;
const MAX_TARGET_WORDS = 4200;
const FALLBACK_MIN_WORDS = 2400;
const FALLBACK_MAX_WORDS = 4600;
const MIN_ACCEPTABLE_WORDS = 1800;
const MAX_REPAIR_SOURCE_CHARS = 18000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseWorkWordGoal(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[,\s，]/g, "");
  if (!normalized) return null;

  const wanMatch = normalized.match(/(\d+(?:\.\d+)?)(?:万|w)/i);
  if (wanMatch) {
    const amount = Number.parseFloat(wanMatch[1] ?? "");
    if (Number.isFinite(amount) && amount > 0) {
      return Math.round(amount * 10_000);
    }
  }

  const rawMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!rawMatch) return null;

  const amount = Number.parseFloat(rawMatch[1] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function clampRepairSource(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_REPAIR_SOURCE_CHARS) return trimmed;

  const head = trimmed.slice(0, Math.floor(MAX_REPAIR_SOURCE_CHARS * 0.7));
  const tail = trimmed.slice(-Math.floor(MAX_REPAIR_SOURCE_CHARS * 0.3));
  return `${head}\n\n[中间部分略，为保留上下文仅截取前后片段]\n\n${tail}`;
}

function getDistanceToRange(wordCount: number, policy: ChapterLengthPolicy) {
  if (wordCount < policy.min) return policy.min - wordCount;
  if (wordCount > policy.max) return wordCount - policy.max;
  return 0;
}

function buildRepairMessages(params: {
  index: number;
  draft: { title: string; content: string };
  generationMode: "generate" | "regenerate";
  issue: "too_short" | "too_long";
  policy: ChapterLengthPolicy;
  promptSnapshot: string;
  wordCount: number;
}) {
  const lengthInstruction =
    params.issue === "too_short"
      ? `当前正文只有 ${params.wordCount} 字，明显偏短。请在不改变主线事件顺序的前提下补足场景、动作、对白、心理和承接，让章节扩展到 ${params.policy.min}-${params.policy.max} 字，理想约 ${params.policy.target} 字。禁止灌水、重复句式、概述式补字。`
      : `当前正文有 ${params.wordCount} 字，明显偏长。请保留关键剧情推进、人物状态、冲突与结尾钩子，压缩重复描述和无效铺陈，把章节收敛到 ${params.policy.min}-${params.policy.max} 字，理想约 ${params.policy.target} 字。`;

  const systemPrompt = [
    buildChapterSystemPrompt(),
    "",
    "你现在不是重新起草，而是在修整一章已经写出的正文长度。",
    "必须保持剧情连续性、人物关系、设定信息和章节结尾钩子。",
    "如果偏短，就补充具体可感的内容；如果偏长，就只压缩冗余，不删主线推进。",
  ].join("\n");

  const userPrompt = [
    "这是本章原始生成要求，请继续遵循：",
    params.promptSnapshot.slice(0, 14_000),
    "",
    params.generationMode === "regenerate"
      ? "当前任务：把这份重生成章节修整到更合适的篇幅。"
      : "当前任务：把这份新生成章节修整到更合适的篇幅。",
    `目标长度：${params.policy.min}-${params.policy.max} 字，理想约 ${params.policy.target} 字。`,
    lengthInstruction,
    "",
    `当前标题：${params.draft.title || getDefaultChapterTitle(params.index)}`,
    `当前字数：${params.wordCount}`,
    "当前正文：",
    clampRepairSource(params.draft.content),
    "",
    "请直接返回合法 JSON：{\"title\":\"...\",\"content\":\"...\"}",
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ] satisfies UpstreamChatMessage[];
}

export function resolveChapterLengthPolicy(params: {
  workWords?: string | null;
  targetChapters?: number | null;
}) {
  const totalWords = parseWorkWordGoal(params.workWords);
  const chapters =
    typeof params.targetChapters === "number" && params.targetChapters > 0
      ? params.targetChapters
      : null;

  const averageTarget =
    totalWords && chapters ? Math.round(totalWords / chapters) : DEFAULT_TARGET_WORDS;
  const target = clamp(averageTarget, MIN_TARGET_WORDS, MAX_TARGET_WORDS);

  return {
    target,
    min: Math.max(FALLBACK_MIN_WORDS, Math.round(target * 0.78)),
    max: Math.min(FALLBACK_MAX_WORDS, Math.round(target * 1.28)),
  } satisfies ChapterLengthPolicy;
}

export function combineTextResultUsage(
  results: Array<Pick<UpstreamTextResult, "usage" | "durationMs"> | null | undefined>,
) {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let durationMs = 0;

  let hasInputTokens = false;
  let hasOutputTokens = false;
  let hasTotalTokens = false;
  let hasDuration = false;

  for (const result of results) {
    if (!result) continue;

    if (typeof result.usage?.inputTokens === "number") {
      inputTokens += result.usage.inputTokens;
      hasInputTokens = true;
    }

    if (typeof result.usage?.outputTokens === "number") {
      outputTokens += result.usage.outputTokens;
      hasOutputTokens = true;
    }

    if (typeof result.usage?.totalTokens === "number") {
      totalTokens += result.usage.totalTokens;
      hasTotalTokens = true;
    }

    if (typeof result.durationMs === "number") {
      durationMs += result.durationMs;
      hasDuration = true;
    }
  }

  return {
    inputTokens: hasInputTokens ? inputTokens : null,
    outputTokens: hasOutputTokens ? outputTokens : null,
    totalTokens: hasTotalTokens ? totalTokens : null,
    durationMs: hasDuration ? durationMs : null,
  };
}

export async function repairChapterLengthIfNeeded(params: {
  index: number;
  draft: { title: string; content: string };
  promptSnapshot: string;
  providers: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId: UpstreamProviderId;
  generationMode: "generate" | "regenerate";
  workWords?: string | null;
  targetChapters?: number | null;
}) {
  const policy = resolveChapterLengthPolicy({
    workWords: params.workWords,
    targetChapters: params.targetChapters,
  });
  const initialWordCount = countWords(params.draft.content);
  const initialDistance = getDistanceToRange(initialWordCount, policy);

  if (initialDistance <= 0) {
    return {
      draft: params.draft,
      wordCount: initialWordCount,
      policy,
      repairAttempted: false,
      repairApplied: false,
    } satisfies ChapterLengthRepairOutcome;
  }

  const issue = initialWordCount < policy.min ? "too_short" : "too_long";
  const repairResult = await callAiText({
    providers: params.providers,
    routeId: params.routeId,
    preferredProviderId: params.preferredProviderId,
    messages: buildRepairMessages({
      index: params.index,
      draft: params.draft,
      generationMode: params.generationMode,
      issue,
      policy,
      promptSnapshot: params.promptSnapshot,
      wordCount: initialWordCount,
    }),
    temperature: 0.55,
    maxTokens: 3200,
    attempts: 1,
    reasoningEffort: "low",
  });

  if (!repairResult.ok || !repairResult.text) {
    return {
      draft: params.draft,
      wordCount: initialWordCount,
      policy,
      repairAttempted: true,
      repairApplied: false,
      repairResult,
      repairNote: `字数修正失败：${getReadableAiErrorMessage(repairResult, "AI 字数修正失败，已保留原稿。")}`,
    } satisfies ChapterLengthRepairOutcome;
  }

  const repairedDraft = finalizeGeneratedDraft({
    index: params.index,
    rawText: repairResult.text,
  });
  const repairedWordCount = countWords(repairedDraft.content);
  const repairedDistance = getDistanceToRange(repairedWordCount, policy);
  const improved =
    repairedDraft.content.trim().length > 0 &&
    repairedWordCount >= MIN_ACCEPTABLE_WORDS &&
    repairedDistance < initialDistance;

  if (!improved) {
    return {
      draft: params.draft,
      wordCount: initialWordCount,
      policy,
      repairAttempted: true,
      repairApplied: false,
      repairResult,
      repairNote: `已尝试字数修正，但保留原稿：原稿 ${initialWordCount} 字，修正稿 ${repairedWordCount} 字。`,
    } satisfies ChapterLengthRepairOutcome;
  }

  return {
    draft: {
      title: repairedDraft.title || params.draft.title || getDefaultChapterTitle(params.index),
      content: repairedDraft.content,
    },
    wordCount: repairedWordCount,
    policy,
    repairAttempted: true,
    repairApplied: true,
    repairResult,
    repairNote: `已自动校正字数：${initialWordCount} -> ${repairedWordCount} 字。`,
  } satisfies ChapterLengthRepairOutcome;
}

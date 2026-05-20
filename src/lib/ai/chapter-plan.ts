import "server-only";

import { z } from "zod";

import {
  beginAiStepJob,
  completeAiStepJob,
  failAiStepJob,
} from "@/lib/ai/chapter-ai-step-job";
import { buildChapterPlanSystemPrompt } from "@/lib/ai/chapter-plan-prompt";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import {
  callAiText,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import type { NovelMode } from "@/lib/ai/novel-canon-state";

export type LongChapterPlan = {
  mode: "long";
  chapterGoal: string;
  openingHook: string;
  sceneBeats: string[];
  mustUseMemories: string[];
  mustAdvanceForeshadowings: string[];
  mustAvoid: string[];
  endingHook: string;
};

export type ShortChapterPlan = {
  mode: "short";
  beatGoal: string;
  emotionalTurn: string;
  sceneBeats: string[];
  mustResolve: string[];
  mustNotOpen: string[];
  endingFunction: string;
};

export type ChapterPlan = LongChapterPlan | ShortChapterPlan;

type PlanCallText = (params: {
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
}) => Promise<Pick<UpstreamTextResult, "ok" | "text" | "upstreamMessage">>;

const longPlanSchema = z
  .object({
    mode: z.literal("long"),
    chapterGoal: z.string().trim().default("推进当前卷目标，并承接上一章冲突。"),
    openingHook: z.string().trim().default("从上一章结尾的动作或情绪继续。"),
    sceneBeats: z.array(z.string().trim().min(1)).max(10).default([]),
    mustUseMemories: z.array(z.string().trim().min(1)).max(10).default([]),
    mustAdvanceForeshadowings: z.array(z.string().trim().min(1)).max(8).default([]),
    mustAvoid: z.array(z.string().trim().min(1)).max(10).default([]),
    endingHook: z.string().trim().default("留下一个与当前卷目标相关的继续阅读钩子。"),
  })
  .strict();

const shortPlanSchema = z
  .object({
    mode: z.literal("short"),
    beatGoal: z.string().trim().default("完成当前 beat 的明确目的。"),
    emotionalTurn: z.string().trim().default("让主角或冲突出现可感知转折。"),
    sceneBeats: z.array(z.string().trim().min(1)).max(8).default([]),
    mustResolve: z.array(z.string().trim().min(1)).max(6).default([]),
    mustNotOpen: z.array(z.string().trim().min(1)).max(6).default([]),
    endingFunction: z.string().trim().default("服务短篇主题和结尾落点。"),
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

export function parseChapterPlan(text: string, mode: NovelMode): ChapterPlan | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const parsed = mode === "short" ? shortPlanSchema.safeParse(raw) : longPlanSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function buildFallbackChapterPlan(params: {
  mode: NovelMode;
  chapterIndex: number;
  currentGoal?: string | null;
  continuityWarnings?: string[];
}): ChapterPlan {
  const warnings = params.continuityWarnings?.filter(Boolean).slice(0, 5) ?? [];
  if (params.mode === "short") {
    return {
      mode: "short",
      beatGoal: params.currentGoal || "完成当前 beat 的冲突推进和信息交付。",
      emotionalTurn: "让主角状态或读者情绪产生明确变化。",
      sceneBeats: [
        "承接前一个 beat 的结尾。",
        "用一个具体行动推动核心冲突。",
        "在结尾完成当前 beat 的功能。",
      ],
      mustResolve: [],
      mustNotOpen: [
        "不要新增无法回收的长期伏笔。",
        "不要扩写成长期世界观铺垫。",
        ...warnings,
      ].slice(0, 6),
      endingFunction: "服务短篇主题、情绪线和最终落点。",
    };
  }

  return {
    mode: "long",
    chapterGoal: params.currentGoal || "承接上一章，并推进当前卷/小节目标。",
    openingHook: "从上一章结尾的情绪、动作或危险继续写起。",
    sceneBeats: [
      "快速接续上一章结尾。",
      "让角色基于既有状态做选择。",
      "推进当前卷目标，并留下下一步压力。",
    ],
    mustUseMemories: [],
    mustAdvanceForeshadowings: [],
    mustAvoid: [
      "不要重置人物状态。",
      "不要重复上一章已完成剧情。",
      "不要随意解决伏笔。",
      ...warnings,
    ].slice(0, 8),
    endingHook: "用未完成的选择、危险或信息差制造继续阅读钩子。",
  };
}

function buildPlanPrompt(params: {
  mode: NovelMode;
  chapterIndex: number;
  assembledContext: string;
  currentGoal?: string | null;
}) {
  const schema =
    params.mode === "short"
      ? '{"mode":"short","beatGoal":"","emotionalTurn":"","sceneBeats":[],"mustResolve":[],"mustNotOpen":[],"endingFunction":""}'
      : '{"mode":"long","chapterGoal":"","openingHook":"","sceneBeats":[],"mustUseMemories":[],"mustAdvanceForeshadowings":[],"mustAvoid":[],"endingHook":""}';
  const guard =
    params.mode === "short"
      ? "短篇计划必须压缩、闭环，防止写成长篇开头；不要新增无法回收的大坑。"
      : "长篇计划必须维护人物状态、时间线、伏笔和设定一致性，防止重复剧情。";

  return [
    "请先为正文生成一个章节执行计划。",
    guard,
    `当前序号：${params.chapterIndex}`,
    params.currentGoal ? `当前目标：${params.currentGoal}` : "",
    "",
    "上下文：",
    params.assembledContext.slice(0, 12000),
    "",
    "只输出严格 JSON，不要 Markdown，不要解释。",
    `JSON schema：${schema}`,
  ].filter(Boolean).join("\n");
}

export async function buildChapterPlan(params: {
  mode: NovelMode;
  chapterIndex: number;
  assembledContext: string;
  currentGoal?: string | null;
  userId?: string | null;
  workId?: string | null;
  chapterId?: string | null;
  providers?: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  continuityWarnings?: string[];
  callText?: PlanCallText;
}): Promise<ChapterPlan> {
  const fallback = buildFallbackChapterPlan(params);
  const callText =
    params.callText ??
    (async ({ messages, temperature, maxTokens }) => {
      if (!params.providers?.length) {
        return { ok: false, upstreamMessage: "no_provider" };
      }
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

  const messages: UpstreamChatMessage[] = [
    { role: "system", content: buildChapterPlanSystemPrompt(params.mode) },
    {
      role: "user",
      content: buildPlanPrompt(params),
    },
  ];
  const tokenConfig = getChapterTokenConfig({ mode: params.mode });
  const stepJob = params.userId && params.workId
    ? await beginAiStepJob({
        userId: params.userId,
        workId: params.workId,
        chapterId: params.chapterId ?? null,
        chapterIndex: params.chapterIndex,
        action: "chapter.plan",
        routeId: params.routeId,
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
        promptSnapshot: messages.map((message) => message.content).join("\n\n"),
      })
    : null;
  let lastResult: Pick<UpstreamTextResult, "ok" | "text" | "upstreamMessage"> | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await callText({
        messages:
          attempt === 0
            ? messages
            : [
                ...messages,
                {
                  role: "user",
                  content: "上一条输出不是可解析 JSON。请只按 schema 重新输出 JSON。",
                },
              ],
        temperature: 0.25,
        maxTokens: tokenConfig.chapterPlan,
      });
      lastResult = result;
      const plan = result.ok && result.text ? parseChapterPlan(result.text, params.mode) : null;
      if (plan) {
        await completeAiStepJob({
          jobId: stepJob?.id,
          result: result as UpstreamTextResult,
          resultSummary: "章节计划生成成功",
          providerId: params.preferredProviderId,
          modelUsed: params.providers?.[0]?.model ?? null,
        });
        return plan;
      }
    } catch {
      // fall through to retry/fallback
    }
  }

  await failAiStepJob({
    jobId: stepJob?.id,
    result: lastResult as UpstreamTextResult | null,
    error: lastResult?.upstreamMessage ?? "chapter_plan_failed",
    resultSummary: "章节计划生成失败，已降级使用规则计划",
    providerId: params.preferredProviderId,
    modelUsed: params.providers?.[0]?.model ?? null,
  });
  return fallback;
}

export function formatChapterPlanForPrompt(plan: ChapterPlan) {
  return JSON.stringify(plan, null, 2);
}

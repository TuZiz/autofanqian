import "server-only";

import { z } from "zod";

import {
  beginAiStepJob,
  completeAiStepJob,
  failAiStepJob,
} from "@/lib/ai/chapter-ai-step-job";
import { getChapterAuxiliaryFlags } from "@/lib/ai/chapter-auxiliary-flags";
import {
  buildChapterConsistencySystemPrompt,
  buildChapterRepairSystemPrompt,
} from "@/lib/ai/chapter-consistency-prompt";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import {
  callAiText,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import type { ChapterPlan } from "@/lib/ai/chapter-plan";
import type { NovelMode } from "@/lib/ai/novel-canon-state";
import type { ChapterAuxiliaryAiCallRunner } from "@/lib/ai/chapter-plan";

export type ChapterConsistencyCheckResult = {
  passed: boolean;
  score: number;
  issues: string[];
  repairPrompt: string;
};

export type ChapterConsistencyRepairResult = {
  check: ChapterConsistencyCheckResult | null;
  repairedContent: string | null;
};

type ConsistencyCallText = (params: {
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
}) => Promise<Pick<UpstreamTextResult, "ok" | "text" | "upstreamMessage">>;

const consistencySchema = z
  .object({
    passed: z.boolean().default(false),
    score: z.coerce.number().min(0).max(100).default(0),
    issues: z.array(z.string().trim().min(1)).max(12).default([]),
    repairPrompt: z.string().trim().default(""),
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

export function parseChapterConsistencyCheck(
  text: string,
): ChapterConsistencyCheckResult | null {
  const raw = extractJson(text);
  if (!raw) return null;
  const parsed = consistencySchema.safeParse(raw);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    passed: parsed.data.passed && parsed.data.score >= 75,
    issues: parsed.data.issues.map((item) => item.trim()).filter(Boolean),
    repairPrompt: parsed.data.repairPrompt.trim(),
  };
}

function buildCheckPrompt(params: {
  mode: NovelMode;
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
  title: string;
  content: string;
}) {
  const checks =
    params.mode === "short"
      ? [
          "是否完成当前 beat 目的",
          "是否写成长篇铺垫",
          "是否节奏拖沓",
          "是否新增过多设定/人物/伏笔",
          "是否服务主题和情绪线",
          "是否与前一个 beat 连贯",
          "如果是最后 beat，是否完成收束",
        ]
      : [
          "是否承接上一章",
          "人物状态是否冲突",
          "地点时间是否跳跃",
          "是否重复上一章",
          "伏笔是否误解",
          "世界设定是否冲突",
          "是否推进当前卷目标",
        ];

  return [
    "请做章节一致性校验，只输出严格 JSON。",
    `模式：${params.mode}`,
    `检查项：${checks.join("；")}`,
    "",
    "上下文：",
    params.assembledContext.slice(0, 9000),
    "",
    params.generationPlan ? `ChapterPlan：${JSON.stringify(params.generationPlan)}` : "",
    "",
    `标题：${params.title}`,
    "正文：",
    params.content.slice(0, 18000),
    "",
    '输出 JSON：{"passed": boolean, "score": 0-100, "issues": [], "repairPrompt": ""}',
  ].filter(Boolean).join("\n");
}

function buildRepairPrompt(params: {
  mode: NovelMode;
  title: string;
  content: string;
  check: ChapterConsistencyCheckResult;
  assembledContext: string;
}) {
  return [
    "请按一致性校验结果修复正文。",
    "只能修改 content，不要修改 title，不要输出解释。",
    `模式：${params.mode}`,
    `标题保持不变：${params.title}`,
    `问题：${params.check.issues.join("；") || params.check.repairPrompt}`,
    params.check.repairPrompt ? `修复要求：${params.check.repairPrompt}` : "",
    "",
    "关键上下文：",
    params.assembledContext.slice(0, 8000),
    "",
    "原正文：",
    params.content.slice(0, 18000),
    "",
    '只输出严格 JSON：{"title":"保持原标题","content":"修复后的正文"}',
  ].filter(Boolean).join("\n");
}

export async function runChapterConsistencyCheck(params: {
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
  callText?: ConsistencyCallText;
  runAiCall?: ChapterAuxiliaryAiCallRunner;
  user?: {
    email: string;
    role?: string | null;
    membershipTier?: string | null;
  } | null;
}): Promise<ChapterConsistencyRepairResult> {
  const flags = getChapterAuxiliaryFlags(params.user);
  if (!flags.consistencyCheck) {
    return { check: null, repairedContent: null };
  }
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
  let checkJob: { id: string } | null = null;
  let repairJob: { id: string } | null = null;
  let activeStep:
    | "chapter_consistency_check"
    | "chapter_consistency_repair"
    | null = null;
  let completedCheck: ChapterConsistencyCheckResult | null = null;

  try {
    const checkMessages: UpstreamChatMessage[] = [
      { role: "system", content: buildChapterConsistencySystemPrompt() },
      { role: "user", content: buildCheckPrompt(params) },
    ];
    checkJob = params.userId && params.workId
      ? await beginAiStepJob({
          userId: params.userId,
          workId: params.workId,
          chapterId: params.chapterId ?? null,
          chapterIndex: params.chapterIndex ?? null,
          action: "chapter.consistency_check",
          routeId: params.routeId,
          providerId: params.preferredProviderId,
          modelUsed: params.providers?.[0]?.model ?? null,
          promptSnapshot: checkMessages.map((message) => message.content).join("\n\n"),
      })
    : null;
    activeStep = "chapter_consistency_check";
    const executeCheckCall = () =>
      callText({
        messages: checkMessages,
        temperature: 0.2,
        maxTokens: tokenConfig.consistencyCheck,
      }) as Promise<UpstreamTextResult>;
    const checkResult = params.runAiCall
      ? await params.runAiCall("chapter_consistency_check", executeCheckCall)
      : await executeCheckCall();
    activeStep = null;
    const check =
      checkResult.ok && checkResult.text
        ? parseChapterConsistencyCheck(checkResult.text)
        : null;
    if (!check) {
      await failAiStepJob({
        jobId: checkJob?.id,
        result: checkResult as UpstreamTextResult,
        error: checkResult.upstreamMessage ?? "chapter_consistency_check_failed",
        resultSummary: "一致性校验失败，已降级跳过",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
      return { check: null, repairedContent: null };
    }
    completedCheck = check;
    await completeAiStepJob({
      jobId: checkJob?.id,
      result: checkResult as UpstreamTextResult,
      resultSummary: check.passed
        ? `一致性校验通过，score=${check.score}`
        : `一致性校验未通过，score=${check.score}`,
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    if (check.score >= 75 && check.passed) {
      return { check, repairedContent: null };
    }
    if (!flags.consistencyRepair) {
      return { check, repairedContent: null };
    }

    const repairMessages: UpstreamChatMessage[] = [
      { role: "system", content: buildChapterRepairSystemPrompt() },
      {
        role: "user",
        content: buildRepairPrompt({
          mode: params.mode,
          title: params.title,
          content: params.content,
          check,
          assembledContext: params.assembledContext,
        }),
      },
    ];
    repairJob = params.userId && params.workId
      ? await beginAiStepJob({
          userId: params.userId,
          workId: params.workId,
          chapterId: params.chapterId ?? null,
          chapterIndex: params.chapterIndex ?? null,
          action: "chapter.consistency_repair",
          routeId: params.routeId,
          providerId: params.preferredProviderId,
          modelUsed: params.providers?.[0]?.model ?? null,
          promptSnapshot: repairMessages.map((message) => message.content).join("\n\n"),
      })
    : null;
    activeStep = "chapter_consistency_repair";
    const executeRepairCall = () =>
      callText({
        messages: repairMessages,
        temperature: 0.25,
        maxTokens: tokenConfig.chapterGenerate,
      }) as Promise<UpstreamTextResult>;
    const repairResult = params.runAiCall
      ? await params.runAiCall("chapter_consistency_repair", executeRepairCall)
      : await executeRepairCall();
    activeStep = null;
    const repaired = repairResult.ok && repairResult.text ? extractJson(repairResult.text) : null;
    if (
      repaired &&
      typeof repaired === "object" &&
      "content" in repaired &&
      typeof (repaired as { content?: unknown }).content === "string"
    ) {
      const content = (repaired as { content: string }).content.trim();
      await completeAiStepJob({
        jobId: repairJob?.id,
        result: repairResult as UpstreamTextResult,
        resultSummary: "一致性校验未通过，已尝试修复",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
      return { check, repairedContent: content || null };
    }

    await failAiStepJob({
      jobId: repairJob?.id,
      result: repairResult as UpstreamTextResult,
      error: repairResult.upstreamMessage ?? "chapter_consistency_repair_failed",
      resultSummary: "一致性校验未通过，已尝试修复",
      providerId: params.preferredProviderId,
      modelUsed: params.providers?.[0]?.model ?? null,
    });
    return { check, repairedContent: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "chapter_consistency_exception";
    const quotaInsufficient = error instanceof AuthApiError && error.status === 429;
    if (activeStep === "chapter_consistency_repair" && repairJob?.id) {
      await failAiStepJob({
        jobId: repairJob.id,
        error: message,
        resultSummary: quotaInsufficient
          ? "额度不足，跳过修复"
          : "一致性修复异常，已降级使用原文",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
    } else if (checkJob?.id) {
      await failAiStepJob({
        jobId: checkJob.id,
        error: message,
        resultSummary: quotaInsufficient
          ? "额度不足，跳过校验"
          : "一致性校验异常，已降级跳过",
        providerId: params.preferredProviderId,
        modelUsed: params.providers?.[0]?.model ?? null,
      });
    }
    return { check: completedCheck, repairedContent: null };
  }
}

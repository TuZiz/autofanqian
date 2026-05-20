import "server-only";

import { z } from "zod";

import { buildChapterSystemPrompt } from "@/lib/ai/chapter-prompt";
import { getChapterTokenConfig } from "@/lib/ai/chapter-token-config";
import {
  callAiText,
  type UpstreamChatMessage,
  type UpstreamProvider,
  type UpstreamRouteId,
  type UpstreamTextResult,
} from "@/lib/ai/upstream-text";
import type { ChapterPlan } from "@/lib/ai/chapter-plan";
import type { NovelMode } from "@/lib/ai/novel-canon-state";

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
  title: string;
  content: string;
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
  providers?: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  callText?: ConsistencyCallText;
}): Promise<ChapterConsistencyRepairResult> {
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

  try {
    const checkResult = await callText({
      messages: [
        { role: "system", content: buildChapterSystemPrompt() },
        { role: "user", content: buildCheckPrompt(params) },
      ],
      temperature: 0.2,
      maxTokens: tokenConfig.consistencyCheck,
    });
    const check =
      checkResult.ok && checkResult.text
        ? parseChapterConsistencyCheck(checkResult.text)
        : null;
    if (!check) return { check: null, repairedContent: null };
    if (check.score >= 75 && check.passed) {
      return { check, repairedContent: null };
    }

    const repairResult = await callText({
      messages: [
        { role: "system", content: buildChapterSystemPrompt() },
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
      ],
      temperature: 0.25,
      maxTokens: tokenConfig.chapterGenerate,
    });
    const repaired = repairResult.ok && repairResult.text ? extractJson(repairResult.text) : null;
    if (
      repaired &&
      typeof repaired === "object" &&
      "content" in repaired &&
      typeof (repaired as { content?: unknown }).content === "string"
    ) {
      const content = (repaired as { content: string }).content.trim();
      return { check, repairedContent: content || null };
    }

    return { check, repairedContent: null };
  } catch {
    return { check: null, repairedContent: null };
  }
}

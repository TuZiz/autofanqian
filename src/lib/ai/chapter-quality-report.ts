import "server-only";

import { z } from "zod";

import type { ChapterConsistencyCheckResult } from "@/lib/ai/chapter-consistency-check";
import { parseChapterQualityCheck } from "@/lib/ai/chapter-quality-check";
import type { ChapterQualityCheckResult } from "@/lib/ai/chapter-quality-check";
import { prisma } from "@/lib/prisma";
import { AI_ACTIONS, getAiActionAliases } from "@/shared/ai-actions";

export type ChapterQualityReport = {
  consistencyScore: number | null;
  consistencyIssues: string[];
  consistencyProviderId: string | null;
  consistencyModelUsed: string | null;
  consistencyTokens: number | null;
  consistencyDurationMs: number | null;
  qualityScore: number | null;
  qualityIssues: string[];
  qualitySuggestions: string[];
  qualityProviderId: string | null;
  qualityModelUsed: string | null;
  qualityTokens: number | null;
  qualityDurationMs: number | null;
};

export function parseQualityReportScore(summary: string | null | undefined) {
  const match = summary?.match(/score=(\d{1,3})|质量评分：(\d{1,3})/);
  const value = match?.[1] ?? match?.[2];
  if (!value) return null;
  const score = Number.parseInt(value, 10);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : null;
}

export function parseQualityReportPayload(text: string | null | undefined) {
  if (!text) return null;
  const match = text.match(/\bJSON=(\{[\s\S]*\})\s*$/);
  if (!match?.[1]) return null;
  const parsed = parseChapterQualityCheck(match[1]);
  if (parsed) {
    return {
      ...parsed,
      score: parseQualityReportScore(text) ?? parsed.score,
    };
  }

  try {
    const raw = JSON.parse(match[1]) as { issues?: unknown; suggestions?: unknown };
    return {
      score: parseQualityReportScore(text) ?? 0,
      rhythm: 0,
      hook: 0,
      emotion: 0,
      conflict: 0,
      issues: Array.isArray(raw.issues)
        ? raw.issues.filter((item): item is string => typeof item === "string")
        : [],
      suggestions: Array.isArray(raw.suggestions)
        ? raw.suggestions.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
}

const consistencyResultSchema = z
  .object({
    score: z.coerce.number().min(0).max(100).default(0),
    issues: z.array(z.string()).default([]),
  })
  .passthrough();

export function parseQualityReportResultJson(value: unknown): ChapterQualityCheckResult | null {
  if (value == null) return null;
  const parsed =
    typeof value === "string"
      ? parseChapterQualityCheck(value)
      : parseChapterQualityCheck(JSON.stringify(value));
  return parsed;
}

export function parseConsistencyReportResultJson(
  value: unknown,
): Pick<ChapterConsistencyCheckResult, "score" | "issues"> | null {
  if (value == null) return null;
  const parsed = consistencyResultSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    score: parsed.data.score,
    issues: parsed.data.issues.map((item) => item.trim()).filter(Boolean),
  };
}

function warnInvalidResultJson(scope: string, value: unknown) {
  if (value == null) return;
  console.warn(`invalid generationJob.resultJson for ${scope}`, {
    valueType: typeof value,
  });
}

const CONSISTENCY_ACTIONS = getAiActionAliases(AI_ACTIONS.chapterConsistency);

export async function getChapterQualityReport(
  workId: string,
  chapterIndex: number,
): Promise<ChapterQualityReport> {
  const [consistencyJob, qualityJob] = await Promise.all([
    prisma.generationJob.findFirst({
      where: {
        novelId: workId,
        chapterIndex,
        action: { in: CONSISTENCY_ACTIONS },
      },
      orderBy: { createdAt: "desc" },
      select: {
        resultSummary: true,
        resultJson: true,
        providerId: true,
        modelUsed: true,
        totalTokens: true,
        durationMs: true,
      },
    }),
    prisma.generationJob.findFirst({
      where: {
        novelId: workId,
        chapterIndex,
        action: "chapter.quality_check",
      },
      orderBy: { createdAt: "desc" },
      select: {
        resultSummary: true,
        resultJson: true,
        providerId: true,
        modelUsed: true,
        totalTokens: true,
        durationMs: true,
      },
    }),
  ]);

  const hasConsistencyResultJson = consistencyJob?.resultJson != null;
  const consistencyJson = parseConsistencyReportResultJson(consistencyJob?.resultJson);
  if (hasConsistencyResultJson && !consistencyJson) {
    warnInvalidResultJson(AI_ACTIONS.chapterConsistency, consistencyJob.resultJson);
  }

  const hasQualityResultJson = qualityJob?.resultJson != null;
  const qualityJson = parseQualityReportResultJson(qualityJob?.resultJson);
  if (hasQualityResultJson && !qualityJson) {
    warnInvalidResultJson("chapter.quality_check", qualityJob.resultJson);
  }

  const quality = hasQualityResultJson
    ? qualityJson
    : parseQualityReportPayload(qualityJob?.resultSummary);
  return {
    consistencyScore:
      consistencyJson?.score ??
      (hasConsistencyResultJson ? null : parseQualityReportScore(consistencyJob?.resultSummary)),
    consistencyIssues: consistencyJson?.issues ?? [],
    consistencyProviderId: consistencyJob?.providerId ?? null,
    consistencyModelUsed: consistencyJob?.modelUsed ?? null,
    consistencyTokens: consistencyJob?.totalTokens ?? null,
    consistencyDurationMs: consistencyJob?.durationMs ?? null,
    qualityScore:
      quality?.score ??
      (hasQualityResultJson ? null : parseQualityReportScore(qualityJob?.resultSummary)),
    qualityIssues: quality?.issues ?? [],
    qualitySuggestions: quality?.suggestions ?? [],
    qualityProviderId: qualityJob?.providerId ?? null,
    qualityModelUsed: qualityJob?.modelUsed ?? null,
    qualityTokens: qualityJob?.totalTokens ?? null,
    qualityDurationMs: qualityJob?.durationMs ?? null,
  };
}

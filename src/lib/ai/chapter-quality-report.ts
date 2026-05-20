import "server-only";

import { parseChapterQualityCheck } from "@/lib/ai/chapter-quality-check";
import { prisma } from "@/lib/prisma";

export type ChapterQualityReport = {
  consistencyScore: number | null;
  qualityScore: number | null;
  qualityIssues: string[];
  qualitySuggestions: string[];
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

export async function getChapterQualityReport(
  workId: string,
  chapterIndex: number,
): Promise<ChapterQualityReport> {
  const [consistencyJob, qualityJob] = await Promise.all([
    prisma.generationJob.findFirst({
      where: {
        novelId: workId,
        chapterIndex,
        action: "chapter.consistency_check",
      },
      orderBy: { createdAt: "desc" },
      select: { resultSummary: true },
    }),
    prisma.generationJob.findFirst({
      where: {
        novelId: workId,
        chapterIndex,
        action: "chapter.quality_check",
      },
      orderBy: { createdAt: "desc" },
      select: { resultSummary: true },
    }),
  ]);

  const quality = parseQualityReportPayload(qualityJob?.resultSummary);
  return {
    consistencyScore: parseQualityReportScore(consistencyJob?.resultSummary),
    qualityScore: quality?.score ?? parseQualityReportScore(qualityJob?.resultSummary),
    qualityIssues: quality?.issues ?? [],
    qualitySuggestions: quality?.suggestions ?? [],
  };
}

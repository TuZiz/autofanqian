import "server-only";

import { parseChapterQualityCheck } from "@/lib/ai/chapter-quality-check";
import { prisma } from "@/lib/prisma";

function parseScore(summary: string | null | undefined) {
  const match = summary?.match(/score=(\d{1,3})|质量评分：(\d{1,3})/);
  const value = match?.[1] ?? match?.[2];
  if (!value) return null;
  const score = Number.parseInt(value, 10);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : null;
}

function parseQualityPayload(text: string | null | undefined) {
  if (!text) return null;
  const jsonMatches = text.match(/\{[\s\S]*?\}/g) ?? [];
  for (const candidate of jsonMatches.reverse()) {
    const parsed = parseChapterQualityCheck(candidate);
    if (parsed) return parsed;
    try {
      const raw = JSON.parse(candidate) as { issues?: unknown; suggestions?: unknown };
      return {
        score: parseScore(text) ?? 0,
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
      // keep scanning
    }
  }
  return null;
}

export async function getChapterQualityReport(workId: string, chapterIndex: number) {
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
      select: { resultSummary: true, promptSnapshot: true },
    }),
  ]);

  const quality =
    parseQualityPayload(qualityJob?.resultSummary) ??
    parseQualityPayload(qualityJob?.promptSnapshot);
  return {
    consistencyScore: parseScore(consistencyJob?.resultSummary),
    qualityScore: quality?.score ?? parseScore(qualityJob?.resultSummary),
    qualityIssues: quality?.issues ?? [],
    qualitySuggestions: quality?.suggestions ?? [],
  };
}

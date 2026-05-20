import "server-only";

import {
  parseConsistencyReportResultJson,
  parseQualityReportPayload,
  parseQualityReportResultJson,
  parseQualityReportScore,
  type ChapterQualityReport,
} from "@/lib/ai/chapter-quality-report";
import { prisma } from "@/lib/prisma";

export type WorkQualityTrendItem = ChapterQualityReport & {
  chapterIndex: number;
};

type QualityTrendJobRow = {
  chapterIndex: number | null;
  action: string;
  resultSummary: string | null;
  resultJson: unknown;
  createdAt: Date;
};

function keepLatestByChapterAndAction(rows: QualityTrendJobRow[]) {
  const latest = new Map<string, QualityTrendJobRow>();
  for (const row of rows) {
    if (typeof row.chapterIndex !== "number") continue;
    const key = `${row.chapterIndex}:${row.action}`;
    const previous = latest.get(key);
    if (!previous || row.createdAt > previous.createdAt) {
      latest.set(key, row);
    }
  }
  return latest;
}

export async function getWorkQualityTrend(
  workId: string,
  limit = 30,
): Promise<WorkQualityTrendItem[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const chapterRows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      chapterIndex: { not: null },
      action: { in: ["chapter.consistency_check", "chapter.quality_check"] },
    },
    distinct: ["chapterIndex"],
    orderBy: [{ chapterIndex: "desc" }],
    take: safeLimit,
    select: { chapterIndex: true },
  });
  const chapterIndexes = chapterRows
    .map((row) => row.chapterIndex)
    .filter((chapterIndex): chapterIndex is number => typeof chapterIndex === "number");

  if (!chapterIndexes.length) return [];

  const rows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      chapterIndex: { in: chapterIndexes },
      action: { in: ["chapter.consistency_check", "chapter.quality_check"] },
    },
    orderBy: [{ chapterIndex: "desc" }, { createdAt: "desc" }],
    select: {
      chapterIndex: true,
      action: true,
      resultSummary: true,
      resultJson: true,
      createdAt: true,
    },
  });

  const latest = keepLatestByChapterAndAction(rows);
  const sortedChapterIndexes = chapterIndexes.sort((left, right) => left - right);

  return sortedChapterIndexes.map((chapterIndex) => {
    const consistency = latest.get(`${chapterIndex}:chapter.consistency_check`);
    const quality = latest.get(`${chapterIndex}:chapter.quality_check`);
    const consistencyPayload = parseConsistencyReportResultJson(consistency?.resultJson);
    const qualityPayload =
      parseQualityReportResultJson(quality?.resultJson) ??
      parseQualityReportPayload(quality?.resultSummary);

    return {
      chapterIndex,
      consistencyScore:
        consistencyPayload?.score ?? parseQualityReportScore(consistency?.resultSummary),
      qualityScore: qualityPayload?.score ?? parseQualityReportScore(quality?.resultSummary),
      qualityIssues: qualityPayload?.issues ?? [],
      qualitySuggestions: qualityPayload?.suggestions ?? [],
    };
  });
}

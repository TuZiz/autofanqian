import "server-only";

import {
  parseConsistencyReportResultJson,
  parseQualityReportPayload,
  parseQualityReportResultJson,
  parseQualityReportScore,
} from "@/lib/ai/chapter-quality-report";
import { prisma } from "@/lib/prisma";

export type ChapterGenerationObservabilityItem = {
  chapterIndex: number;
  generateProviderId: string | null;
  generateModelUsed: string | null;
  generateTokens: number | null;
  generateDurationMs: number | null;
  consistencyScore: number | null;
  qualityScore: number | null;
  repaired: boolean;
  lengthRepaired: boolean;
};

const GENERATE_ACTIONS = [
  "chapter.generate",
  "chapter.generate.stream",
  "regenerate.all",
  "regenerate.all.stream",
  "chapter_generate",
  "chapter_regenerate",
];

const OBSERVABILITY_ACTIONS = [
  ...GENERATE_ACTIONS,
  "chapter.consistency_check",
  "chapter.quality_check",
  "chapter.consistency_repair",
  "chapter_generate_length_repair",
  "chapter_generate_stream_length_repair",
];

type ChapterGenerationJobRow = {
  chapterIndex: number | null;
  action: string;
  status: string;
  providerId: string | null;
  modelUsed: string | null;
  totalTokens: number | null;
  durationMs: number | null;
  resultJson: unknown;
  resultSummary: string | null;
  createdAt: Date;
};

function latestByChapterAndAction(rows: ChapterGenerationJobRow[]) {
  const latest = new Map<string, ChapterGenerationJobRow>();
  for (const row of rows) {
    if (typeof row.chapterIndex !== "number") continue;
    const key = `${row.chapterIndex}:${row.action}`;
    const previous = latest.get(key);
    if (!previous || row.createdAt > previous.createdAt) latest.set(key, row);
  }
  return latest;
}

export async function getChapterGenerationObservability(
  workId: string,
): Promise<ChapterGenerationObservabilityItem[]> {
  const rows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      chapterIndex: { not: null },
      action: { in: OBSERVABILITY_ACTIONS },
    },
    orderBy: [{ chapterIndex: "asc" }, { createdAt: "desc" }],
    select: {
      chapterIndex: true,
      action: true,
      status: true,
      providerId: true,
      modelUsed: true,
      totalTokens: true,
      durationMs: true,
      resultJson: true,
      resultSummary: true,
      createdAt: true,
    },
  });
  const chapterIndexes = Array.from(
    new Set(rows.map((row) => row.chapterIndex).filter((index): index is number => typeof index === "number")),
  ).sort((left, right) => left - right);
  const latest = latestByChapterAndAction(rows);

  return chapterIndexes.map((chapterIndex) => {
    const generate =
      GENERATE_ACTIONS.map((action) => latest.get(`${chapterIndex}:${action}`)).find(Boolean) ??
      null;
    const consistency = latest.get(`${chapterIndex}:chapter.consistency_check`);
    const quality = latest.get(`${chapterIndex}:chapter.quality_check`);
    const consistencyPayload = parseConsistencyReportResultJson(consistency?.resultJson);
    const qualityPayload =
      parseQualityReportResultJson(quality?.resultJson) ??
      parseQualityReportPayload(quality?.resultSummary);
    const repaired = rows.some(
      (row) =>
        row.chapterIndex === chapterIndex &&
        row.action === "chapter.consistency_repair" &&
        row.status === "succeeded",
    );
    const lengthRepaired = rows.some(
      (row) =>
        row.chapterIndex === chapterIndex &&
        (row.action === "chapter_generate_length_repair" ||
          row.action === "chapter_generate_stream_length_repair") &&
        row.status === "succeeded",
    );

    return {
      chapterIndex,
      generateProviderId: generate?.providerId ?? null,
      generateModelUsed: generate?.modelUsed ?? null,
      generateTokens: generate?.totalTokens ?? null,
      generateDurationMs: generate?.durationMs ?? null,
      consistencyScore:
        consistencyPayload?.score ?? parseQualityReportScore(consistency?.resultSummary),
      qualityScore: qualityPayload?.score ?? parseQualityReportScore(quality?.resultSummary),
      repaired,
      lengthRepaired,
    };
  });
}

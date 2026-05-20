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
  generateSucceeded: boolean | null;
  generateFailed: boolean;
  repairSucceeded: boolean;
  lengthRepairSucceeded: boolean;
};

export type ChapterGenerationObservabilityOptions = {
  from?: Date;
  to?: Date;
  limit?: number;
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

function normalizeLimit(limit: number | undefined) {
  const value = Math.floor(limit ?? 100);
  if (!Number.isFinite(value)) return 100;
  return Math.max(1, Math.min(300, value));
}

function buildCreatedAtWhere(options: ChapterGenerationObservabilityOptions) {
  return {
    ...(options.from ? { gte: options.from } : {}),
    ...(options.to ? { lte: options.to } : {}),
  };
}

async function getRecentChapterIndexes(
  workId: string,
  options: ChapterGenerationObservabilityOptions,
) {
  const rows = await prisma.generationJob.groupBy({
    by: ["chapterIndex"],
    where: {
      novelId: workId,
      chapterIndex: { not: null },
      action: { in: OBSERVABILITY_ACTIONS },
      createdAt: buildCreatedAtWhere(options),
    },
    _max: { createdAt: true },
    orderBy: [{ _max: { createdAt: "desc" } }],
    take: normalizeLimit(options.limit),
  });

  return rows
    .map((row) => row.chapterIndex)
    .filter((chapterIndex): chapterIndex is number => typeof chapterIndex === "number");
}

function getLatestGenerateJob(latest: Map<string, ChapterGenerationJobRow>, chapterIndex: number) {
  return (
    GENERATE_ACTIONS.map((action) => latest.get(`${chapterIndex}:${action}`))
      .filter((row): row is ChapterGenerationJobRow => Boolean(row))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
  );
}

export async function getChapterGenerationObservability(
  workId: string,
  options: ChapterGenerationObservabilityOptions = {},
): Promise<ChapterGenerationObservabilityItem[]> {
  const chapterIndexes = await getRecentChapterIndexes(workId, options);
  if (!chapterIndexes.length) return [];

  const rows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      chapterIndex: { in: chapterIndexes },
      action: { in: OBSERVABILITY_ACTIONS },
      createdAt: buildCreatedAtWhere(options),
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
  const latest = latestByChapterAndAction(rows);

  return [...chapterIndexes].sort((left, right) => left - right).map((chapterIndex) => {
    const generate = getLatestGenerateJob(latest, chapterIndex);
    const consistency = latest.get(`${chapterIndex}:chapter.consistency_check`);
    const quality = latest.get(`${chapterIndex}:chapter.quality_check`);
    const consistencyPayload = parseConsistencyReportResultJson(consistency?.resultJson);
    const qualityPayload =
      parseQualityReportResultJson(quality?.resultJson) ??
      parseQualityReportPayload(quality?.resultSummary);
    const generateRows = rows.filter(
      (row) => row.chapterIndex === chapterIndex && GENERATE_ACTIONS.includes(row.action),
    );
    const hasSucceededGenerate = generateRows.some((row) => row.status === "succeeded");
    const generateSucceeded = generate ? generate.status === "succeeded" : null;
    const generateFailed =
      generateRows.some((row) => row.status === "failed") && !hasSucceededGenerate;
    const repairSucceeded = rows.some(
      (row) =>
        row.chapterIndex === chapterIndex &&
        row.action === "chapter.consistency_repair" &&
        row.status === "succeeded",
    );
    const lengthRepairSucceeded = rows.some(
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
      repaired: repairSucceeded,
      lengthRepaired: lengthRepairSucceeded,
      generateSucceeded,
      generateFailed,
      repairSucceeded,
      lengthRepairSucceeded,
    };
  });
}

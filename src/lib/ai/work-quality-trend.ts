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

export type WorkQualityTrendOptions = {
  limit?: number;
  orderBy?: "chapterIndex" | "updatedAt";
  sortOutput?: "chapterIndex" | "updatedAt";
  from?: Date;
  to?: Date;
};

type QualityTrendJobRow = {
  chapterIndex: number | null;
  action: string;
  resultSummary: string | null;
  resultJson: unknown;
  providerId: string | null;
  modelUsed: string | null;
  totalTokens: number | null;
  durationMs: number | null;
  createdAt: Date;
};

const QUALITY_ACTIONS = ["chapter.consistency_check", "chapter.quality_check"] as const;

function normalizeOptions(options?: number | WorkQualityTrendOptions) {
  const raw =
    typeof options === "number"
      ? { limit: options }
      : options ?? {};
  return {
    limit: Math.max(1, Math.min(100, Math.floor(raw.limit ?? 30))),
    orderBy: raw.orderBy === "updatedAt" ? "updatedAt" : "chapterIndex",
    sortOutput: raw.sortOutput === "updatedAt" ? "updatedAt" : "chapterIndex",
    from: raw.from,
    to: raw.to,
  };
}

function buildCreatedAtWhere(options: Pick<WorkQualityTrendOptions, "from" | "to">) {
  return {
    ...(options.from ? { gte: options.from } : {}),
    ...(options.to ? { lte: options.to } : {}),
  };
}

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

async function getRecentChapterIndexesByChapterIndex(
  workId: string,
  options: Pick<Required<ReturnType<typeof normalizeOptions>>, "limit" | "from" | "to">,
) {
  const chapterRows = await prisma.generationJob.groupBy({
    by: ["chapterIndex"],
    where: {
      novelId: workId,
      chapterIndex: { not: null },
      action: { in: [...QUALITY_ACTIONS] },
      createdAt: buildCreatedAtWhere(options),
    },
    orderBy: [{ chapterIndex: "desc" }],
    take: options.limit,
  });

  return chapterRows
    .map((row) => row.chapterIndex)
    .filter((chapterIndex): chapterIndex is number => typeof chapterIndex === "number");
}

async function getRecentChapterIndexesByUpdatedAt(
  workId: string,
  options: Pick<Required<ReturnType<typeof normalizeOptions>>, "limit" | "from" | "to">,
) {
  const rows = await prisma.generationJob.groupBy({
    by: ["chapterIndex"],
    where: {
      novelId: workId,
      chapterIndex: { not: null },
      action: { in: [...QUALITY_ACTIONS] },
      createdAt: buildCreatedAtWhere(options),
    },
    _max: { createdAt: true },
    orderBy: [{ _max: { createdAt: "desc" } }],
    take: options.limit,
  });

  return rows
    .map((row) => row.chapterIndex)
    .filter((chapterIndex): chapterIndex is number => typeof chapterIndex === "number");
}

export async function getWorkQualityTrend(
  workId: string,
  options?: number | WorkQualityTrendOptions,
): Promise<WorkQualityTrendItem[]> {
  const normalized = normalizeOptions(options);
  const chapterIndexes =
    normalized.orderBy === "updatedAt"
      ? await getRecentChapterIndexesByUpdatedAt(workId, normalized)
      : await getRecentChapterIndexesByChapterIndex(workId, normalized);

  if (!chapterIndexes.length) return [];

  const rows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      chapterIndex: { in: chapterIndexes },
      action: { in: [...QUALITY_ACTIONS] },
      createdAt: buildCreatedAtWhere(normalized),
    },
    orderBy: [{ chapterIndex: "desc" }, { createdAt: "desc" }],
    select: {
      chapterIndex: true,
      action: true,
      resultSummary: true,
      resultJson: true,
      providerId: true,
      modelUsed: true,
      totalTokens: true,
      durationMs: true,
      createdAt: true,
    },
  });

  const latest = keepLatestByChapterAndAction(rows);
  const sortedChapterIndexes =
    normalized.sortOutput === "updatedAt"
      ? [...chapterIndexes]
      : [...chapterIndexes].sort((left, right) => left - right);

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
      consistencyIssues: consistencyPayload?.issues ?? [],
      consistencyProviderId: consistency?.providerId ?? null,
      consistencyModelUsed: consistency?.modelUsed ?? null,
      consistencyTokens: consistency?.totalTokens ?? null,
      consistencyDurationMs: consistency?.durationMs ?? null,
      qualityScore: qualityPayload?.score ?? parseQualityReportScore(quality?.resultSummary),
      qualityIssues: qualityPayload?.issues ?? [],
      qualitySuggestions: qualityPayload?.suggestions ?? [],
      qualityProviderId: quality?.providerId ?? null,
      qualityModelUsed: quality?.modelUsed ?? null,
      qualityTokens: quality?.totalTokens ?? null,
      qualityDurationMs: quality?.durationMs ?? null,
    };
  });
}

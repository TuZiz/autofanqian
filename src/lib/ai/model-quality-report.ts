import "server-only";

import {
  parseConsistencyReportResultJson,
  parseQualityReportPayload,
  parseQualityReportResultJson,
  parseQualityReportScore,
} from "@/lib/ai/chapter-quality-report";
import { prisma } from "@/lib/prisma";

export type ModelQualityReportRange = {
  from?: Date;
  to?: Date;
  minJobs?: number;
};

export type ModelQualityReportItem = {
  providerId: string | null;
  modelUsed: string | null;
  avgConsistencyScore: number | null;
  avgQualityScore: number | null;
  consistencyJobCount: number;
  qualityJobCount: number;
  consistencyTokens: number;
  qualityTokens: number;
  avgConsistencyDurationMs: number | null;
  avgQualityDurationMs: number | null;
  sampleWarning: string | null;
  jobCount: number;
  totalTokens: number;
  avgDurationMs: number | null;
};

type ModelQualityAccumulator = {
  providerId: string | null;
  modelUsed: string | null;
  consistencyScoreSum: number;
  consistencyScoreCount: number;
  qualityScoreSum: number;
  qualityScoreCount: number;
  consistencyJobCount: number;
  qualityJobCount: number;
  consistencyTokens: number;
  qualityTokens: number;
  consistencyDurationSum: number;
  consistencyDurationCount: number;
  qualityDurationSum: number;
  qualityDurationCount: number;
  jobCount: number;
  totalTokens: number;
  durationSum: number;
  durationCount: number;
};

const QUALITY_ACTIONS = ["chapter.consistency_check", "chapter.quality_check"] as const;

function average(sum: number, count: number) {
  return count > 0 ? Math.round(sum / count) : null;
}

function getScore(row: {
  action: string;
  resultJson: unknown;
  resultSummary: string | null;
}) {
  if (row.action === "chapter.consistency_check") {
    return (
      parseConsistencyReportResultJson(row.resultJson)?.score ??
      parseQualityReportScore(row.resultSummary)
    );
  }

  return (
    parseQualityReportResultJson(row.resultJson)?.score ??
    parseQualityReportPayload(row.resultSummary)?.score ??
    parseQualityReportScore(row.resultSummary)
  );
}

function getSampleWarning(params: {
  consistencyJobCount: number;
  qualityJobCount: number;
  avgConsistencyScore: number | null;
  avgQualityScore: number | null;
}) {
  if (params.consistencyJobCount + params.qualityJobCount < 3) return "样本量过低";
  if (params.avgConsistencyScore === null || params.avgQualityScore === null) {
    return "评分数据不完整";
  }
  return null;
}

export async function getModelQualityReport(
  workId: string,
  range: ModelQualityReportRange = {},
): Promise<ModelQualityReportItem[]> {
  const minJobs = Math.max(1, Math.min(100, Math.floor(range.minJobs ?? 1)));
  const rows = await prisma.generationJob.findMany({
    where: {
      novelId: workId,
      action: { in: [...QUALITY_ACTIONS] },
      createdAt: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    },
    select: {
      action: true,
      providerId: true,
      modelUsed: true,
      resultJson: true,
      resultSummary: true,
      totalTokens: true,
      durationMs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const groups = new Map<string, ModelQualityAccumulator>();
  for (const row of rows) {
    const key = `${row.providerId ?? "unknown"}:${row.modelUsed ?? "unknown"}`;
    const group =
      groups.get(key) ??
      {
        providerId: row.providerId ?? null,
        modelUsed: row.modelUsed ?? null,
        consistencyScoreSum: 0,
        consistencyScoreCount: 0,
        qualityScoreSum: 0,
        qualityScoreCount: 0,
        consistencyJobCount: 0,
        qualityJobCount: 0,
        consistencyTokens: 0,
        qualityTokens: 0,
        consistencyDurationSum: 0,
        consistencyDurationCount: 0,
        qualityDurationSum: 0,
        qualityDurationCount: 0,
        jobCount: 0,
        totalTokens: 0,
        durationSum: 0,
        durationCount: 0,
      };

    const score = getScore(row);
    if (row.action === "chapter.consistency_check") {
      group.consistencyJobCount += 1;
      group.consistencyTokens += row.totalTokens ?? 0;
      if (typeof row.durationMs === "number") {
        group.consistencyDurationSum += row.durationMs;
        group.consistencyDurationCount += 1;
      }
      if (typeof score === "number") {
        group.consistencyScoreSum += score;
        group.consistencyScoreCount += 1;
      }
    }
    if (row.action === "chapter.quality_check") {
      group.qualityJobCount += 1;
      group.qualityTokens += row.totalTokens ?? 0;
      if (typeof row.durationMs === "number") {
        group.qualityDurationSum += row.durationMs;
        group.qualityDurationCount += 1;
      }
      if (typeof score === "number") {
        group.qualityScoreSum += score;
        group.qualityScoreCount += 1;
      }
    }
    group.jobCount += 1;
    group.totalTokens += row.totalTokens ?? 0;
    if (typeof row.durationMs === "number") {
      group.durationSum += row.durationMs;
      group.durationCount += 1;
    }
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .filter((group) => group.jobCount >= minJobs)
    .map((group) => {
      const avgConsistencyScore = average(group.consistencyScoreSum, group.consistencyScoreCount);
      const avgQualityScore = average(group.qualityScoreSum, group.qualityScoreCount);
      return {
        providerId: group.providerId,
        modelUsed: group.modelUsed,
        avgConsistencyScore,
        avgQualityScore,
        consistencyJobCount: group.consistencyJobCount,
        qualityJobCount: group.qualityJobCount,
        consistencyTokens: group.consistencyTokens,
        qualityTokens: group.qualityTokens,
        avgConsistencyDurationMs: average(
          group.consistencyDurationSum,
          group.consistencyDurationCount,
        ),
        avgQualityDurationMs: average(group.qualityDurationSum, group.qualityDurationCount),
        sampleWarning: getSampleWarning({
          consistencyJobCount: group.consistencyJobCount,
          qualityJobCount: group.qualityJobCount,
          avgConsistencyScore,
          avgQualityScore,
        }),
        jobCount: group.jobCount,
        totalTokens: group.totalTokens,
        avgDurationMs: average(group.durationSum, group.durationCount),
      };
    })
    .sort((left, right) => right.totalTokens - left.totalTokens);
}

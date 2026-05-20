import "server-only";

import { prisma } from "@/lib/prisma";

export type AuxiliaryAiCostAction =
  | "chapter.plan"
  | "chapter.consistency_check"
  | "chapter.consistency_repair"
  | "chapter.quality_check"
  | "canon.compress";

export type AuxiliaryAiCostReportRange = {
  from?: Date;
  to?: Date;
};

export type AuxiliaryAiCostReportItem = {
  action: AuxiliaryAiCostAction;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  jobCount: number;
  avgTokensPerJob: number;
  avgInputTokensPerJob: number;
  avgOutputTokensPerJob: number;
};

export type AuxiliaryAiCostReport = {
  totalTokens: number;
  jobCount: number;
  avgTokensPerJob: number;
  byAction: AuxiliaryAiCostReportItem[];
};

const AUXILIARY_AI_ACTIONS: AuxiliaryAiCostAction[] = [
  "chapter.plan",
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
];

function average(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0;
}

export async function getAuxiliaryAiCostReport(
  workId: string,
  range: AuxiliaryAiCostReportRange = {},
): Promise<AuxiliaryAiCostReport> {
  const rows = await prisma.generationJob.groupBy({
    by: ["action"],
    where: {
      novelId: workId,
      action: { in: AUXILIARY_AI_ACTIONS },
      createdAt: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    },
    _count: { _all: true },
    _sum: {
      totalTokens: true,
      inputTokens: true,
      outputTokens: true,
    },
  });

  const byAction = AUXILIARY_AI_ACTIONS.map((action) => {
    const row = rows.find((item) => item.action === action);
    const totalTokens = row?._sum.totalTokens ?? 0;
    const inputTokens = row?._sum.inputTokens ?? 0;
    const outputTokens = row?._sum.outputTokens ?? 0;
    const jobCount = row?._count._all ?? 0;
    return {
      action,
      totalTokens,
      inputTokens,
      outputTokens,
      jobCount,
      avgTokensPerJob: average(totalTokens, jobCount),
      avgInputTokensPerJob: average(inputTokens, jobCount),
      avgOutputTokensPerJob: average(outputTokens, jobCount),
    };
  });
  const totalTokens = byAction.reduce((sum, item) => sum + item.totalTokens, 0);
  const jobCount = byAction.reduce((sum, item) => sum + item.jobCount, 0);

  return {
    totalTokens,
    jobCount,
    avgTokensPerJob: average(totalTokens, jobCount),
    byAction,
  };
}

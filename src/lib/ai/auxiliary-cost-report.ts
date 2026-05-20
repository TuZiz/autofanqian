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
};

export type AuxiliaryAiCostReport = {
  totalTokens: number;
  byAction: AuxiliaryAiCostReportItem[];
};

const AUXILIARY_AI_ACTIONS: AuxiliaryAiCostAction[] = [
  "chapter.plan",
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
];

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
    return {
      action,
      totalTokens: row?._sum.totalTokens ?? 0,
      inputTokens: row?._sum.inputTokens ?? 0,
      outputTokens: row?._sum.outputTokens ?? 0,
      jobCount: row?._count._all ?? 0,
    };
  });

  return {
    totalTokens: byAction.reduce((sum, item) => sum + item.totalTokens, 0),
    byAction,
  };
}

import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AuxiliaryAiCostAction =
  | "chapter.generate"
  | "chapter.generate.stream"
  | "regenerate.all"
  | "regenerate.all.stream"
  | "chapter_generate"
  | "chapter_regenerate"
  | "chapter_generate_length_repair"
  | "chapter_generate_stream_length_repair"
  | "chapter.plan"
  | "chapter.consistency_check"
  | "chapter.consistency_repair"
  | "chapter.quality_check"
  | "canon.compress";

export type AuxiliaryAiCostReportRange = {
  from?: Date;
  to?: Date;
};

export type AuxiliaryAiCostReportFilter = AuxiliaryAiCostReportRange & {
  userId?: string | null;
  workId?: string | null;
  action?: AuxiliaryAiCostAction | null;
  actions?: readonly AuxiliaryAiCostAction[];
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

export type AuxiliaryAiCostDimensionItem = {
  userId?: string | null;
  workId?: string | null;
  providerId?: string | null;
  modelUsed?: string | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  jobCount: number;
  avgTokensPerJob: number;
  avgInputTokensPerJob: number;
  avgOutputTokensPerJob: number;
};

export type GlobalAuxiliaryAiCostReport = AuxiliaryAiCostReport & {
  byUser: AuxiliaryAiCostDimensionItem[];
  byWork: AuxiliaryAiCostDimensionItem[];
  byProvider: AuxiliaryAiCostDimensionItem[];
  byModel: AuxiliaryAiCostDimensionItem[];
};

const AUXILIARY_AI_ACTIONS: AuxiliaryAiCostAction[] = [
  "chapter.plan",
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
];

export const GENERATION_COST_ACTIONS: AuxiliaryAiCostAction[] = [
  "chapter.generate",
  "chapter.generate.stream",
  "regenerate.all",
  "regenerate.all.stream",
  "chapter_generate",
  "chapter_regenerate",
  "chapter_generate_length_repair",
  "chapter_generate_stream_length_repair",
  "chapter.plan",
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
];

function average(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0;
}

function buildWhere(filter: AuxiliaryAiCostReportFilter = {}): Prisma.GenerationJobWhereInput {
  const actions = filter.action ? [filter.action] : filter.actions ?? AUXILIARY_AI_ACTIONS;
  return {
    ...(filter.workId ? { novelId: filter.workId } : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
    action: { in: [...actions] },
    createdAt: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  };
}

function toDimensionItem(
  key: "userId" | "workId" | "providerId" | "model",
  row: {
    userId?: string | null;
    novelId?: string | null;
    providerId?: string | null;
    modelUsed?: string | null;
    _count: { _all: number };
    _sum: { totalTokens: number | null; inputTokens: number | null; outputTokens: number | null };
  },
): AuxiliaryAiCostDimensionItem {
  const totalTokens = row._sum.totalTokens ?? 0;
  const inputTokens = row._sum.inputTokens ?? 0;
  const outputTokens = row._sum.outputTokens ?? 0;
  const jobCount = row._count._all ?? 0;
  const dimension =
    key === "userId"
      ? { userId: row.userId ?? null }
      : key === "workId"
        ? { workId: row.novelId ?? null }
        : key === "providerId"
          ? { providerId: row.providerId ?? null }
          : { providerId: row.providerId ?? null, modelUsed: row.modelUsed ?? null };
  return {
    ...dimension,
    totalTokens,
    inputTokens,
    outputTokens,
    jobCount,
    avgTokensPerJob: average(totalTokens, jobCount),
    avgInputTokensPerJob: average(inputTokens, jobCount),
    avgOutputTokensPerJob: average(outputTokens, jobCount),
  };
}

async function getAuxiliaryAiCostSummary(
  filter: AuxiliaryAiCostReportFilter = {},
): Promise<AuxiliaryAiCostReport> {
  const actions = filter.action ? [filter.action] : filter.actions ?? AUXILIARY_AI_ACTIONS;
  const rows = await prisma.generationJob.groupBy({
    by: ["action"],
    where: buildWhere(filter),
    _count: { _all: true },
    _sum: {
      totalTokens: true,
      inputTokens: true,
      outputTokens: true,
    },
  });

  const byAction = actions.map((action) => {
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

export async function getAuxiliaryAiCostReport(
  workId: string,
  range: AuxiliaryAiCostReportRange = {},
): Promise<AuxiliaryAiCostReport> {
  return getAuxiliaryAiCostSummary({ ...range, workId });
}

export async function getGlobalAuxiliaryAiCostReport(
  filter: AuxiliaryAiCostReportFilter = {},
): Promise<GlobalAuxiliaryAiCostReport> {
  const where = buildWhere(filter);
  const [summary, byUserRows, byWorkRows, byProviderRows, byModelRows] = await Promise.all([
    getAuxiliaryAiCostSummary(filter),
    prisma.generationJob.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 100,
    }),
    prisma.generationJob.groupBy({
      by: ["novelId"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 100,
    }),
    prisma.generationJob.groupBy({
      by: ["providerId"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 100,
    }),
    prisma.generationJob.groupBy({
      by: ["providerId", "modelUsed"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 100,
    }),
  ]);

  return {
    ...summary,
    byUser: byUserRows.map((row) => toDimensionItem("userId", row)),
    byWork: byWorkRows.map((row) => toDimensionItem("workId", row)),
    byProvider: byProviderRows.map((row) => toDimensionItem("providerId", row)),
    byModel: byModelRows.map((row) => toDimensionItem("model", row)),
  };
}

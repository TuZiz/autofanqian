import "server-only";

import { Prisma } from "@prisma/client";

import {
  getGenerationJobFailureCount,
  parseGenerationJobProgress,
} from "@/lib/jobs/generation-job-progress";
import { prisma } from "@/lib/prisma";
import type {
  GenerationLogDetail,
  GenerationLogListItem,
  GenerationLogStatus,
  GenerationLogStatusFilter,
  GenerationLogsResponse,
} from "@/lib/admin/generation-log-types";

const successStatuses: GenerationLogStatus[] = ["succeeded", "success"];
const failedStatuses: GenerationLogStatus[] = ["failed"];
const runningStatuses: GenerationLogStatus[] = ["running"];
const queuedStatuses: GenerationLogStatus[] = ["queued"];
const staleStatuses: GenerationLogStatus[] = ["stale"];
const cancelledStatuses: GenerationLogStatus[] = ["cancelled"];

type ListParams = {
  cursor?: string;
  q?: string;
  status: GenerationLogStatusFilter;
  take: number;
};

export async function listGenerationLogs(params: ListParams): Promise<GenerationLogsResponse> {
  const where = buildListWhere(params);
  const todayStart = getLocalDayStart();

  const [
    jobs,
    counts,
    latestWindow,
    latestFailed,
    todayTotal,
    todaySuccess,
    todayFailed,
    todayStats,
  ] = await prisma.$transaction([
    prisma.generationJob.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.take + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      select: generationLogListSelect,
    }),
    prisma.generationJob.groupBy({
      by: ["status"],
      orderBy: { status: "asc" },
      _count: { id: true },
    }),
    prisma.generationJob.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 60,
      select: {
        id: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        error: true,
        resultSummary: true,
        resultJson: true,
      },
    }),
    prisma.generationJob.findFirst({
      where: { status: { in: failedStatuses } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        error: true,
        errorMessage: true,
        resultSummary: true,
      },
    }),
    prisma.generationJob.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.generationJob.count({
      where: { createdAt: { gte: todayStart }, status: { in: successStatuses } },
    }),
    prisma.generationJob.count({
      where: { createdAt: { gte: todayStart }, status: { in: failedStatuses } },
    }),
    prisma.generationJob.aggregate({
      where: { createdAt: { gte: todayStart } },
      _avg: { durationMs: true },
      _sum: { totalTokens: true },
    }),
  ]);

  const visibleJobs = jobs.slice(0, params.take);
  const nextCursor = jobs.length > params.take ? jobs[params.take]?.id ?? null : null;
  const summaryCounts = summarizeLatestWindow(latestWindow);

  return {
    counts: counts.map((item) => ({
      count: getGroupedCount(item),
      status: item.status,
    })),
    jobs: visibleJobs.map(serializeGenerationLogListItem),
    nextCursor,
    summary: {
      ...summaryCounts,
      bars: latestWindow.map((item) => ({
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
      latestFailedMessage:
        latestFailed?.errorMessage ??
        latestFailed?.error ??
        latestFailed?.resultSummary ??
        null,
    },
    today: {
      total: todayTotal,
      success: todaySuccess,
      failed: todayFailed,
      successRate: todayTotal ? Math.round((todaySuccess / todayTotal) * 1000) / 10 : 0,
      avgDurationMs:
        typeof todayStats._avg.durationMs === "number"
          ? Math.round(todayStats._avg.durationMs)
          : null,
      totalTokens: todayStats._sum.totalTokens ?? 0,
    },
  };
}

export async function getGenerationLogDetail(id: string): Promise<GenerationLogDetail | null> {
  const job = await prisma.generationJob.findUnique({
    where: { id },
    select: generationLogDetailSelect,
  });

  return job ? serializeGenerationLogDetail(job) : null;
}

const generationLogListSelect = {
  id: true,
  action: true,
  jobType: true,
  status: true,
  resultSummary: true,
  errorMessage: true,
  error: true,
  chapterIndex: true,
  routeId: true,
  providerId: true,
  modelUsed: true,
  inputTokens: true,
  outputTokens: true,
  totalTokens: true,
  durationMs: true,
  createdAt: true,
  startedAt: true,
  heartbeatAt: true,
  finishedAt: true,
  completedAt: true,
  resultJson: true,
  novel: {
    select: {
      id: true,
      title: true,
      workType: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.GenerationJobSelect;

const generationLogDetailSelect = {
  ...generationLogListSelect,
  promptTemplateKey: true,
  promptTemplateVersion: true,
  promptSnapshot: true,
  chapter: {
    select: {
      id: true,
      index: true,
      title: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      membershipTier: true,
    },
  },
} satisfies Prisma.GenerationJobSelect;

type GenerationLogListRow = Prisma.GenerationJobGetPayload<{
  select: typeof generationLogListSelect;
}>;

type GenerationLogDetailRow = Prisma.GenerationJobGetPayload<{
  select: typeof generationLogDetailSelect;
}>;

function buildListWhere(params: ListParams): Prisma.GenerationJobWhereInput {
  const and: Prisma.GenerationJobWhereInput[] = [];

  if (params.status !== "all") {
    and.push({ status: params.status });
  }

  const query = params.q?.trim();
  if (query) {
    and.push({
      OR: [
        { action: { contains: query, mode: "insensitive" } },
        { jobType: { contains: query, mode: "insensitive" } },
        { modelUsed: { contains: query, mode: "insensitive" } },
        { providerId: { contains: query, mode: "insensitive" } },
        { routeId: { contains: query, mode: "insensitive" } },
        { novel: { title: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

function serializeGenerationLogListItem(row: GenerationLogListRow): GenerationLogListItem {
  return {
    id: row.id,
    action: row.action,
    jobType: row.jobType,
    status: row.status,
    resultSummary: row.resultSummary,
    errorMessage: row.errorMessage,
    error: row.error,
    chapterIndex: row.chapterIndex,
    routeId: row.routeId,
    providerId: row.providerId,
    modelUsed: row.modelUsed,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    progress: parseGenerationJobProgress(row.resultJson),
    failureCount: getGenerationJobFailureCount(row.resultJson),
    novel: row.novel
      ? {
          id: row.novel.id,
          title: row.novel.title,
          workType: row.novel.workType,
        }
      : null,
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
        }
      : null,
  };
}

function serializeGenerationLogDetail(row: GenerationLogDetailRow): GenerationLogDetail {
  const listItem = serializeGenerationLogListItem(row);

  return {
    ...listItem,
    chapter: row.chapter
      ? {
          id: row.chapter.id,
          index: row.chapter.index,
          title: row.chapter.title,
        }
      : null,
    promptSnapshot: row.promptSnapshot,
    promptTemplateKey: row.promptTemplateKey,
    promptTemplateVersion: row.promptTemplateVersion,
    resultJson: row.resultJson,
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          role: row.user.role,
          membershipTier: row.user.membershipTier,
        }
      : null,
  };
}

function summarizeLatestWindow(
  rows: Array<{
    status: GenerationLogStatus;
  }>,
) {
  const successCount = countByStatuses(rows, successStatuses);
  const failedCount = countByStatuses(rows, failedStatuses);
  const runningCount = countByStatuses(rows, runningStatuses);
  const queuedCount = countByStatuses(rows, queuedStatuses);
  const staleCount = countByStatuses(rows, staleStatuses);
  const cancelledCount = countByStatuses(rows, cancelledStatuses);
  const latestWindowSize = rows.length;

  return {
    latestWindowSize,
    successRate: latestWindowSize
      ? Math.round((successCount / latestWindowSize) * 1000) / 10
      : 0,
    successCount,
    failedCount,
    runningCount,
    queuedCount,
    staleCount,
    cancelledCount,
  };
}

function countByStatuses(
  rows: Array<{ status: GenerationLogStatus }>,
  statuses: GenerationLogStatus[],
) {
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function getGroupedCount(item: {
  _count?: true | {
    _all?: number;
    id?: number;
  };
}) {
  const count = item._count;
  if (typeof count === "object" && count !== null) {
    return count.id ?? count._all ?? 0;
  }
  return 0;
}

function getLocalDayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

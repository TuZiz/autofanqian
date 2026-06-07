import "server-only";

import { getAiRouteConfigsFromEnv } from "@/backend/ai/upstream/upstream-text";
import { AuthApiError } from "@/lib/auth/errors";
import { markStaleGenerationJobs } from "@/lib/ai/generation-jobs";
import type { DashboardAiStatus } from "@/lib/dashboard/dashboard-types";
import { prisma } from "@/lib/prisma";

const RECENT_STATUS_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_PERFORMANCE_WINDOW_SIZE = 60;
const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;
const FAILED_JOB_STATUSES = ["failed", "stale"] as const;
const SUCCESS_JOB_STATUSES = ["succeeded", "success"] as const;

type GetDashboardAiStatusParams = {
  chapterIndex?: number;
  isAdmin: boolean;
  userId: string;
  workId?: string;
};

type ServiceState = DashboardAiStatus["service"]["state"];
type ContextState = DashboardAiStatus["context"]["state"];
type QueueState = DashboardAiStatus["queue"]["state"];

function matchesStatus(status: string | null, values: readonly string[]) {
  return Boolean(status && values.includes(status));
}

function normalizeGenerationOutcome(
  status: string,
): DashboardAiStatus["performance"]["recentOutcomes"][number] | null {
  if (matchesStatus(status, SUCCESS_JOB_STATUSES)) {
    return "success";
  }

  if (matchesStatus(status, FAILED_JOB_STATUSES)) {
    return "failed";
  }

  return null;
}

function buildPerformanceStatus(
  rows: Array<{ status: string }>,
): DashboardAiStatus["performance"] {
  const recentOutcomes = rows
    .map((row) => normalizeGenerationOutcome(row.status))
    .filter(
      (
        outcome,
      ): outcome is DashboardAiStatus["performance"]["recentOutcomes"][number] =>
        outcome !== null,
    )
    .reverse();
  const recentCount = recentOutcomes.length;
  const successCount = recentOutcomes.filter((outcome) => outcome === "success").length;
  const failedCount = recentCount - successCount;

  return {
    recentCount,
    successCount,
    failedCount,
    successRate: recentCount ? Math.round((successCount / recentCount) * 10000) / 100 : 0,
    recentOutcomes,
  };
}

function buildServiceStatus(params: {
  configured: boolean;
  failedCalls: number;
  successCalls: number;
  totalCalls: number;
}): DashboardAiStatus["service"] {
  if (!params.configured) {
    return {
      state: "unavailable",
      tone: "danger",
      title: "AI 暂不可用",
      description: "AI 服务尚未配置，请联系管理员。",
    };
  }

  if (params.totalCalls === 0) {
    return {
      state: "unknown",
      tone: "info",
      title: "AI 已配置",
      description: "最近 24 小时暂无调用记录，创作功能可尝试使用。",
    };
  }

  const failedRate = params.failedCalls / params.totalCalls;
  if (params.successCalls === 0 && params.failedCalls >= 3) {
    return {
      state: "unavailable",
      tone: "danger",
      title: "AI 近期不可用",
      description: "最近调用均失败，请稍后重试或联系管理员。",
    };
  }

  if (params.failedCalls >= 3 || failedRate >= 0.3) {
    return {
      state: "degraded",
      tone: "warning",
      title: "AI 近期不稳定",
      description: "最近调用有失败记录，仍可尝试继续创作。",
    };
  }

  return {
    state: "available",
    tone: "success",
    title: "AI 服务可用",
    description: "AI 服务运行正常，创作功能可用。",
  };
}

function buildContextStatus(params: {
  characterCount: number;
  foreshadowingCount: number;
  hasWork: boolean;
  memoryCount: number;
  previousChapterCount: number;
  summaryCount: number;
  timelineCount: number;
  worldSettingCount: number;
}): DashboardAiStatus["context"] {
  if (!params.hasWork) {
    return {
      state: "none",
      tone: "neutral",
      title: "未选择作品",
      description: "创建或选择作品后，会加载写作上下文。",
    };
  }

  const knowledgeCount =
    params.memoryCount +
    params.characterCount +
    params.worldSettingCount +
    params.timelineCount +
    params.foreshadowingCount;
  const contextScore = params.previousChapterCount + params.summaryCount + knowledgeCount;

  if (contextScore <= 0) {
    return {
      state: "empty",
      tone: "warning",
      title: "上下文待补全",
      description: "当前作品暂无可用上下文，可先补充正文、角色或设定。",
    };
  }

  if (params.summaryCount > 0 || knowledgeCount >= 3 || params.previousChapterCount >= 2) {
    return {
      state: "ready",
      tone: "info",
      title: "上下文已加载",
      description: "当前作品上下文已加载，可用于续写和辅助创作。",
    };
  }

  return {
    state: "partial",
    tone: "warning",
    title: "上下文较少",
    description: "已找到部分上下文，建议继续补充摘要、角色和设定。",
  };
}

function buildQueueStatus(params: {
  activeCount: number;
  failedCount: number;
  latestStatus: string | null;
  successCount: number;
}): DashboardAiStatus["queue"] {
  if (params.activeCount > 0) {
    return {
      state: "running",
      tone: "ai",
      title: "AI 正在生成中",
      description: `${params.activeCount} 个生成任务正在排队或运行。`,
    };
  }

  if (params.failedCount > 0 && matchesStatus(params.latestStatus, FAILED_JOB_STATUSES)) {
    return {
      state: "failed",
      tone: "danger",
      title: "最近任务失败",
      description: "最近一次生成未完成，可进入作品页重试。",
    };
  }

  if (params.successCount > 0) {
    return {
      state: "done",
      tone: "success",
      title: "最近生成完成",
      description: "最近 24 小时已有 AI 任务成功完成。",
    };
  }

  return {
    state: "idle",
    tone: "neutral",
    title: "准备就绪",
    description: "当前没有运行中的 AI 生成任务。",
  };
}

function buildReadinessStatus(params: {
  contextState: ContextState;
  hasWork: boolean;
  queueState: QueueState;
  serviceState: ServiceState;
}): DashboardAiStatus["readiness"] {
  if (params.serviceState === "unavailable") {
    return {
      tone: "danger",
      title: "AI 暂不可用",
      description: "当前 AI 服务不可用，请稍后重试或联系管理员。",
    };
  }

  if (params.queueState === "running") {
    return {
      tone: "ai",
      title: "AI 正在生成中",
      description: "已有生成任务在运行，完成后即可继续查看或编辑。",
    };
  }

  if (!params.hasWork) {
    return {
      tone: "warning",
      title: "需要先创建作品",
      description: "创建或导入作品后，这里会显示真实上下文和生成状态。",
    };
  }

  if (params.serviceState === "degraded") {
    return {
      tone: "warning",
      title: "可继续创作",
      description: "AI 近期有失败记录，如生成失败可稍后重试。",
    };
  }

  if (params.contextState === "empty" || params.contextState === "partial") {
    return {
      tone: "info",
      title: "可基础创作",
      description: "当前上下文较少，仍可继续创作，补充设定后效果更稳定。",
    };
  }

  return {
    tone: "success",
    title: "可继续创作",
    description: "AI 服务与作品上下文已就绪，可正常进行创作与续写。",
  };
}

export async function getDashboardAiStatus(
  params: GetDashboardAiStatusParams,
): Promise<DashboardAiStatus> {
  const now = new Date();
  const recentSince = new Date(now.getTime() - RECENT_STATUS_WINDOW_MS);
  await markStaleGenerationJobs(now);
  const routeConfigs = getAiRouteConfigsFromEnv();
  const configured = routeConfigs.some((route) => route.configured);

  const work = params.workId
    ? await prisma.work.findFirst({
        where: {
          id: params.workId,
          deletedAt: null,
          ...(params.isAdmin ? {} : { userId: params.userId }),
        },
        select: { id: true },
      })
    : null;

  if (params.workId && !work) {
    throw new AuthApiError(404, "作品不存在或无权查看。");
  }

  const chapterIndex = Math.max(1, params.chapterIndex ?? 1);
  const jobScope = work
    ? {
        userId: params.userId,
        workId: work.id,
      }
    : {
        userId: params.userId,
      };

  const [
    totalCalls,
    successCalls,
    failedCalls,
    activeCount,
    failedCount,
    successCount,
    latestJob,
    recentPerformanceJobs,
    previousChapterCount,
    summaryCount,
    memoryCount,
    characterCount,
    worldSettingCount,
    timelineCount,
    foreshadowingCount,
  ] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: { userId: params.userId, createdAt: { gte: recentSince } },
    }),
    prisma.aiUsageEvent.count({
      where: { userId: params.userId, createdAt: { gte: recentSince }, success: true },
    }),
    prisma.aiUsageEvent.count({
      where: { userId: params.userId, createdAt: { gte: recentSince }, success: false },
    }),
    prisma.generationJob.count({
      where: { ...jobScope, status: { in: [...ACTIVE_JOB_STATUSES] } },
    }),
    prisma.generationJob.count({
      where: {
        ...jobScope,
        createdAt: { gte: recentSince },
        status: { in: [...FAILED_JOB_STATUSES] },
      },
    }),
    prisma.generationJob.count({
      where: {
        ...jobScope,
        createdAt: { gte: recentSince },
        status: { in: [...SUCCESS_JOB_STATUSES] },
      },
    }),
    prisma.generationJob.findFirst({
      where: { ...jobScope, createdAt: { gte: recentSince } },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
    prisma.generationJob.findMany({
      where: {
        ...jobScope,
        status: { in: [...SUCCESS_JOB_STATUSES, ...FAILED_JOB_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_PERFORMANCE_WINDOW_SIZE,
      select: { status: true },
    }),
    work
      ? prisma.chapter.count({
          where: {
            workId: work.id,
            deletedAt: null,
            index: { lt: chapterIndex },
            wordCount: { gt: 0 },
          },
        })
      : Promise.resolve(0),
    work
      ? prisma.chapter.count({
          where: {
            workId: work.id,
            deletedAt: null,
            index: { lt: chapterIndex },
            summary: { not: null },
          },
        })
      : Promise.resolve(0),
    work
      ? prisma.writingMemory.count({
          where: { novelId: work.id, isActive: true },
        })
      : Promise.resolve(0),
    work
      ? prisma.character.count({
          where: { novelId: work.id, deletedAt: null },
        })
      : Promise.resolve(0),
    work
      ? prisma.worldSetting.count({
          where: { novelId: work.id, deletedAt: null },
        })
      : Promise.resolve(0),
    work
      ? prisma.timelineEvent.count({
          where: { novelId: work.id, deletedAt: null, chapterIndex: { lt: chapterIndex } },
        })
      : Promise.resolve(0),
    work
      ? prisma.foreshadowing.count({
          where: { novelId: work.id, deletedAt: null },
        })
      : Promise.resolve(0),
  ]);

  const service = buildServiceStatus({
    configured,
    failedCalls,
    successCalls,
    totalCalls,
  });
  const context = buildContextStatus({
    characterCount,
    foreshadowingCount,
    hasWork: Boolean(work),
    memoryCount,
    previousChapterCount,
    summaryCount,
    timelineCount,
    worldSettingCount,
  });
  const queue = buildQueueStatus({
    activeCount,
    failedCount,
    latestStatus: latestJob?.status ?? null,
    successCount,
  });
  const readiness = buildReadinessStatus({
    contextState: context.state,
    hasWork: Boolean(work),
    queueState: queue.state,
    serviceState: service.state,
  });
  const performance = buildPerformanceStatus(recentPerformanceJobs);

  return {
    service,
    context,
    queue,
    readiness,
    performance,
    updatedAt: now.toISOString(),
  };
}

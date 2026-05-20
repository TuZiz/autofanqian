import "server-only";

import { Prisma } from "@prisma/client";

import type { UpstreamTextResult } from "@/lib/ai/upstream-text";
import {
  getAiUsagePeriodKeys,
  incrementAiUsageCountersWithClient,
  sumUsageCounters,
  type UsageCounterClient,
} from "@/lib/ai/usage-counter";
import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { buildAiUsageEventData } from "@/lib/ai/usage-log";
import { getMembershipLimits } from "@/lib/membership/limits";
import {
  assertMembershipAiUsageAvailable,
  isUnlimitedMembershipLimit,
} from "@/lib/membership/rules";
import { getAiActionLimit } from "@/lib/membership/guards";
import { prisma } from "@/lib/prisma";

export type AiQuotaUser = {
  id: string;
  email: string;
  role?: string | null;
  membershipTier?: string | null;
};

export type AiQuotaReservationHandle = {
  id: string;
  userId: string;
  action: string;
} | null;

type QuotaClient = (typeof prisma | Prisma.TransactionClient) & UsageCounterClient;
type AiQuotaReservationStatusValue =
  | "pending"
  | "committed"
  | "committed_failed"
  | "cancelled";
type AiUsageEventData = ReturnType<typeof buildAiUsageEventData>;
type FinalizeAiQuotaTransactionClient = {
  aiUsageEvent: {
    create(args: { data: AiUsageEventData; select: { id: true } }): Promise<unknown>;
  };
  aiUsageCounter: UsageCounterClient["aiUsageCounter"];
  aiQuotaReservation: {
    findUnique(args: {
      where: { id: string };
      select: { status: true };
    }): Promise<{ status: AiQuotaReservationStatusValue } | null>;
    update(args: {
      where: { id: string };
      data: { status: AiQuotaReservationStatusValue };
    }): Promise<unknown>;
  };
};
type FinalizeAiQuotaClient = {
  $transaction<T>(
    fn: (tx: FinalizeAiQuotaTransactionClient) => Promise<T>,
  ): Promise<T>;
  aiUsageEvent: {
    create(args: { data: AiUsageEventData; select: { id: true } }): Promise<unknown>;
  };
  aiUsageCounter: UsageCounterClient["aiUsageCounter"];
  aiQuotaReservation: {
    updateMany(args: {
      where: { id: string; status: "pending" };
      data: { status: "committed_failed" | "cancelled" };
    }): Promise<unknown>;
  };
};
type RunWithAiQuotaReservationOps = {
  reserve(
    user: AiQuotaUser,
    action: string,
    options?: AiQuotaReservationOptions,
  ): Promise<AiQuotaReservationHandle>;
  finalize(params: {
    reservation: AiQuotaReservationHandle;
    result: UpstreamTextResult;
    action: string;
    userId?: string | null;
  }): Promise<void>;
  cancel(reservation: AiQuotaReservationHandle): Promise<void>;
};

const RESERVATION_TTL_MS = 5 * 60_000;

export type AiQuotaReservationOptions = {
  estimatedTokens?: number | null;
  estimatedOutputChars?: number | null;
  idempotencyKey?: string | null;
  excludeGenerationJobId?: string | null;
};

function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getMonthRange(now = new Date()) {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

function getActionLimitForTier(
  action: string,
  limits: Awaited<ReturnType<typeof getMembershipLimits>>,
) {
  return getAiActionLimit({
    action,
    dailyLongNovelOutlines: limits.dailyLongNovelOutlines,
    dailyShortStoryOutlines: limits.dailyShortStoryOutlines,
    dailyIdeaGenerations: limits.dailyIdeaGenerations,
    dailyIdeaAnalyses: limits.dailyIdeaAnalyses,
    dailyChapterGenerations: limits.dailyChapterGenerations,
    dailyChapterSummaries: limits.dailyChapterSummaries,
    dailyChapterOutlines: limits.dailyChapterOutlines,
    dailyChapterDetails: limits.dailyChapterDetails,
  });
}

async function getAiQuotaUsageSnapshot(params: {
  client: QuotaClient;
  userId: string;
  now: Date;
  dailyCallLimit: number;
  dailyGeneratedCharLimit: number;
  dailyTokenLimit: number;
  minuteCallLimit: number;
  monthlyGeneratedCharLimit: number;
  excludeGenerationJobId?: string | null;
}) {
  const { client, userId, now } = params;
  const { start, end } = getTodayRange(now);
  const { start: monthStart, end: monthEnd } = getMonthRange(now);
  const minuteStart = new Date(now.getTime() - 60_000);
  const periodKeys = getAiUsagePeriodKeys(now);
  const reservationWhere: Prisma.AiQuotaReservationWhereInput = {
    userId,
    OR: [
      { status: "pending", expiresAt: { gt: now } },
      { status: "committed_failed" },
    ],
  };
  const activeGenerationJobWhere: Prisma.GenerationJobWhereInput = {
    createdAt: { gte: minuteStart },
    status: { in: ["queued", "running"] },
    novel: { userId },
  };
  if (params.excludeGenerationJobId) {
    activeGenerationJobWhere.id = { not: params.excludeGenerationJobId };
  }

  const [
    successCallCount,
    tokenUsage,
    pendingDailyReservations,
    pendingTokenEstimate,
    dailyCharUsage,
    pendingDailyCharEstimate,
    monthlyCharUsage,
    pendingMonthlyCharEstimate,
    recentSuccessCount,
    pendingMinuteReservations,
    activeJobCount,
    dailyCounters,
    monthlyCounters,
    minuteCounters,
  ] = await Promise.all([
    !isUnlimitedMembershipLimit(params.dailyCallLimit)
      ? client.aiUsageEvent.count({
          where: {
            userId,
            createdAt: { gte: start, lt: end },
            success: true,
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(params.dailyTokenLimit)
      ? client.aiUsageEvent.aggregate({
          where: {
            userId,
            createdAt: { gte: start, lt: end },
            OR: [{ success: true }, { totalTokens: { gt: 0 } }],
          },
          _sum: { totalTokens: true },
        })
      : Promise.resolve({ _sum: { totalTokens: null } }),
    !isUnlimitedMembershipLimit(params.dailyCallLimit)
      ? client.aiQuotaReservation.count({
          where: {
            ...reservationWhere,
            createdAt: { gte: start, lt: end },
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(params.dailyTokenLimit)
      ? client.aiQuotaReservation.aggregate({
          where: {
            ...reservationWhere,
            createdAt: { gte: start, lt: end },
          },
          _sum: { estimatedTokens: true },
        })
      : Promise.resolve({ _sum: { estimatedTokens: null } }),
    !isUnlimitedMembershipLimit(params.dailyGeneratedCharLimit)
      ? client.aiUsageEvent.aggregate({
          where: {
            userId,
            createdAt: { gte: start, lt: end },
            outputChars: { gt: 0 },
          },
          _sum: { outputChars: true },
        })
      : Promise.resolve({ _sum: { outputChars: null } }),
    !isUnlimitedMembershipLimit(params.dailyGeneratedCharLimit)
      ? client.aiQuotaReservation.aggregate({
          where: {
            ...reservationWhere,
            createdAt: { gte: start, lt: end },
          },
          _sum: { estimatedOutputChars: true },
        })
      : Promise.resolve({ _sum: { estimatedOutputChars: null } }),
    !isUnlimitedMembershipLimit(params.monthlyGeneratedCharLimit)
      ? client.aiUsageEvent.aggregate({
          where: {
            userId,
            createdAt: { gte: monthStart, lt: monthEnd },
            outputChars: { gt: 0 },
          },
          _sum: { outputChars: true },
        })
      : Promise.resolve({ _sum: { outputChars: null } }),
    !isUnlimitedMembershipLimit(params.monthlyGeneratedCharLimit)
      ? client.aiQuotaReservation.aggregate({
          where: {
            ...reservationWhere,
            createdAt: { gte: monthStart, lt: monthEnd },
          },
          _sum: { estimatedOutputChars: true },
        })
      : Promise.resolve({ _sum: { estimatedOutputChars: null } }),
    !isUnlimitedMembershipLimit(params.minuteCallLimit)
      ? client.aiUsageEvent.count({
          where: {
            userId,
            createdAt: { gte: minuteStart },
            success: true,
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(params.minuteCallLimit)
      ? client.aiQuotaReservation.count({
          where: {
            ...reservationWhere,
            createdAt: { gte: minuteStart },
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(params.minuteCallLimit)
      ? client.generationJob.count({
          where: activeGenerationJobWhere,
        })
      : Promise.resolve(0),
    (
      !isUnlimitedMembershipLimit(params.dailyCallLimit) ||
      !isUnlimitedMembershipLimit(params.dailyGeneratedCharLimit) ||
      !isUnlimitedMembershipLimit(params.dailyTokenLimit)
    )
      ? client.aiUsageCounter.findMany({
          where: { userId, periodType: "daily", periodKey: periodKeys.daily },
          select: { requestCount: true, charCount: true, tokenCount: true },
        })
      : Promise.resolve([]),
    !isUnlimitedMembershipLimit(params.monthlyGeneratedCharLimit)
      ? client.aiUsageCounter.findMany({
          where: { userId, periodType: "monthly", periodKey: periodKeys.monthly },
          select: { requestCount: true, charCount: true, tokenCount: true },
        })
      : Promise.resolve([]),
    !isUnlimitedMembershipLimit(params.minuteCallLimit)
      ? client.aiUsageCounter.findMany({
          where: { userId, periodType: "minute", periodKey: periodKeys.minute },
          select: { requestCount: true, charCount: true, tokenCount: true },
        })
      : Promise.resolve([]),
  ]);
  const dailyCounterUsage = sumUsageCounters(dailyCounters);
  const monthlyCounterUsage = sumUsageCounters(monthlyCounters);
  const minuteCounterUsage = sumUsageCounters(minuteCounters);

  return {
    activeJobs: activeJobCount,
    dailyCalls: Math.max(successCallCount, dailyCounterUsage.requestCount) + pendingDailyReservations,
    dailyGeneratedChars:
      Math.max(dailyCharUsage._sum.outputChars ?? 0, dailyCounterUsage.charCount) +
      (pendingDailyCharEstimate._sum.estimatedOutputChars ?? 0),
    dailyTokens:
      Math.max(tokenUsage._sum.totalTokens ?? 0, dailyCounterUsage.tokenCount) +
      (pendingTokenEstimate._sum.estimatedTokens ?? 0),
    minuteCalls: Math.max(recentSuccessCount, minuteCounterUsage.requestCount) + pendingMinuteReservations,
    monthlyGeneratedChars:
      Math.max(monthlyCharUsage._sum.outputChars ?? 0, monthlyCounterUsage.charCount) +
      (pendingMonthlyCharEstimate._sum.estimatedOutputChars ?? 0),
  };
}

async function assertAiActionQuotaAvailable(params: {
  client: QuotaClient;
  user: AiQuotaUser;
  action: string;
  now: Date;
  limits: Awaited<ReturnType<typeof getMembershipLimits>>;
}) {
  const actionLimit = getActionLimitForTier(params.action, params.limits);
  if (!actionLimit || isUnlimitedMembershipLimit(actionLimit.limit)) return;

  const { start, end } = getTodayRange(params.now);
  const actionFilter: Prisma.StringFilter =
    actionLimit.actions.length === 1
      ? { equals: actionLimit.actions[0] }
      : { in: actionLimit.actions };

  const [usedCount, pendingReservationCount] = await Promise.all([
    params.client.aiUsageEvent.count({
      where: {
        userId: params.user.id,
        action: actionFilter,
        success: true,
        createdAt: { gte: start, lt: end },
      },
    }),
    params.client.aiQuotaReservation.count({
      where: {
        userId: params.user.id,
        action: actionFilter,
        OR: [
          { status: "pending", expiresAt: { gt: params.now } },
          { status: "committed_failed" },
        ],
        createdAt: { gte: start, lt: end },
      },
    }),
  ]);

  if (usedCount + pendingReservationCount >= actionLimit.limit) {
    throw new AuthApiError(
      429,
      `${params.limits.label} 今日${actionLimit.actionName}次数已用完，请升级套餐或明天再试。`,
    );
  }
}

export async function assertAiQuotaAvailable(user: AiQuotaUser) {
  if (isAdminUser(user)) return;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  const dailyCallLimit = limits.dailyAiCalls;
  const dailyTokenLimit = limits.dailyTokens;
  const minuteCallLimit = limits.minuteAiCalls;

  if (
    isUnlimitedMembershipLimit(dailyCallLimit) &&
    isUnlimitedMembershipLimit(dailyTokenLimit) &&
    isUnlimitedMembershipLimit(minuteCallLimit)
  ) {
    return;
  }

  const usage = await getAiQuotaUsageSnapshot({
    client: prisma,
    userId: user.id,
    now: new Date(),
    dailyCallLimit,
    dailyGeneratedCharLimit: limits.dailyGeneratedChars,
    dailyTokenLimit,
    minuteCallLimit,
    monthlyGeneratedCharLimit: limits.monthlyGeneratedChars,
  });

  assertMembershipAiUsageAvailable(limits, usage);
}

export async function reserveAiQuota(
  user: AiQuotaUser,
  action: string,
  options?: AiQuotaReservationOptions,
): Promise<AiQuotaReservationHandle> {
  if (isAdminUser(user)) return null;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);
  const estimatedTokens =
    typeof options?.estimatedTokens === "number" && options.estimatedTokens > 0
      ? Math.round(options.estimatedTokens)
      : null;
  const estimatedOutputChars =
    typeof options?.estimatedOutputChars === "number" && options.estimatedOutputChars > 0
      ? Math.round(options.estimatedOutputChars)
      : null;
  const idempotencyKey = options?.idempotencyKey?.trim() || null;

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        const existingReservation = idempotencyKey
          ? await tx.aiQuotaReservation.findUnique({
              where: {
                userId_action_idempotencyKey: {
                  userId: user.id,
                  action,
                  idempotencyKey,
                },
              },
              select: {
                id: true,
                userId: true,
                action: true,
                status: true,
                expiresAt: true,
              },
            })
          : null;

        if (existingReservation?.status === "pending" && existingReservation.expiresAt > now) {
          return {
            id: existingReservation.id,
            userId: existingReservation.userId,
            action: existingReservation.action,
          };
        }

        if (existingReservation?.status === "committed") {
          throw new AuthApiError(409, "该 AI 请求已经处理过，请刷新查看结果。");
        }

        if (existingReservation?.status === "committed_failed") {
          throw new AuthApiError(409, "该 AI 请求状态异常，请稍后重试。");
        }

        const usage = await getAiQuotaUsageSnapshot({
          client: tx,
          userId: user.id,
          now,
          dailyCallLimit: limits.dailyAiCalls,
          dailyGeneratedCharLimit: limits.dailyGeneratedChars,
          dailyTokenLimit: limits.dailyTokens,
          minuteCallLimit: limits.minuteAiCalls,
          monthlyGeneratedCharLimit: limits.monthlyGeneratedChars,
          excludeGenerationJobId: options?.excludeGenerationJobId ?? null,
        });

        assertMembershipAiUsageAvailable(limits, usage);
        await assertAiActionQuotaAvailable({
          client: tx,
          user,
          action,
          now,
          limits,
        });

        if (existingReservation) {
          return tx.aiQuotaReservation.update({
            where: { id: existingReservation.id },
            data: {
              status: "pending",
              estimatedTokens,
              estimatedOutputChars,
              expiresAt,
            },
            select: {
              id: true,
              userId: true,
              action: true,
            },
          });
        }

        return tx.aiQuotaReservation.create({
          data: {
            userId: user.id,
            action,
            idempotencyKey,
            estimatedTokens,
            estimatedOutputChars,
            expiresAt,
          },
          select: {
            id: true,
            userId: true,
            action: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return reservation;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AuthApiError(
        429,
        `${limits.label} 当前请求过于密集，请稍后再试。`,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      idempotencyKey
    ) {
      const existingReservation = await prisma.aiQuotaReservation.findUnique({
        where: {
          userId_action_idempotencyKey: {
            userId: user.id,
            action,
            idempotencyKey,
          },
        },
        select: {
          id: true,
          userId: true,
          action: true,
          status: true,
          expiresAt: true,
        },
      });

      if (existingReservation?.status === "pending" && existingReservation.expiresAt > now) {
        return {
          id: existingReservation.id,
          userId: existingReservation.userId,
          action: existingReservation.action,
        };
      }
    }

    throw error;
  }
}

export async function commitAiQuotaReservation(
  reservation: AiQuotaReservationHandle,
) {
  if (!reservation) return;

  try {
    await prisma.aiQuotaReservation.updateMany({
      where: {
        id: reservation.id,
        status: "pending",
      },
      data: { status: "committed" },
    });
  } catch (error) {
    console.warn("Failed to commit AI quota reservation:", error);
  }
}

function shouldPersistFailedUsage(result: UpstreamTextResult) {
  return typeof result.usage?.totalTokens === "number" && result.usage.totalTokens > 0;
}

function isSuccessfulAiResult(result: UpstreamTextResult) {
  return Boolean(result.ok && result.text);
}

export async function finalizeAiQuotaUsageWithClient(
  client: FinalizeAiQuotaClient,
  params: {
    reservation: AiQuotaReservationHandle;
    result: UpstreamTextResult;
    action: string;
    userId?: string | null;
  },
) {
  const { reservation, result } = params;
  const shouldCreateUsageEvent =
    isSuccessfulAiResult(result) || shouldPersistFailedUsage(result);

  if (!reservation) {
    if (shouldCreateUsageEvent) {
      try {
        const usageParams = {
          userId: params.userId ?? null,
          action: params.action,
          result,
        };
        await client.aiUsageEvent.create({
          data: buildAiUsageEventData(usageParams),
          select: { id: true },
        });
        await incrementAiUsageCountersWithClient(client, usageParams);
      } catch (error) {
        console.warn("Failed to log admin AI usage:", error);
      }
    }
    return;
  }

  try {
    await client.$transaction(async (tx) => {
      const currentReservation = await tx.aiQuotaReservation.findUnique({
        where: { id: reservation.id },
        select: { status: true },
      });

      if (!currentReservation || currentReservation.status !== "pending") return;

      if (shouldCreateUsageEvent) {
        const usageParams = {
          userId: params.userId ?? reservation.userId,
          action: params.action,
          result,
        };
        await tx.aiUsageEvent.create({
          data: buildAiUsageEventData(usageParams),
          select: { id: true },
        });
        await incrementAiUsageCountersWithClient(tx, usageParams);
      }

      await tx.aiQuotaReservation.update({
        where: { id: reservation.id },
        data: {
          status: isSuccessfulAiResult(result) ? "committed" : "cancelled",
        },
      });
    });
  } catch (error) {
    if (!shouldCreateUsageEvent) {
      await cancelAiQuotaReservation(reservation);
      return;
    }

    await client.aiQuotaReservation.updateMany({
      where: {
        id: reservation.id,
        status: "pending",
      },
      data: { status: "committed_failed" },
    });

    console.warn("Failed to finalize AI quota usage:", error);
  }
}

export async function finalizeAiQuotaUsage(params: {
  reservation: AiQuotaReservationHandle;
  result: UpstreamTextResult;
  action: string;
  userId?: string | null;
}) {
  await finalizeAiQuotaUsageWithClient(
    prisma as unknown as FinalizeAiQuotaClient,
    params,
  );
}

export async function cancelAiQuotaReservation(
  reservation: AiQuotaReservationHandle,
) {
  if (!reservation) return;

  try {
    await prisma.aiQuotaReservation.updateMany({
      where: {
        id: reservation.id,
        status: "pending",
      },
      data: { status: "cancelled" },
    });
  } catch (error) {
    console.warn("Failed to cancel AI quota reservation:", error);
  }
}

export async function settleAiQuotaReservation(
  reservation: AiQuotaReservationHandle,
  result: UpstreamTextResult,
  action?: string,
) {
  if (action) {
    await finalizeAiQuotaUsage({
      reservation,
      result,
      action,
      userId: reservation?.userId ?? null,
    });
    return;
  }

  if (result.ok && result.text) {
    await commitAiQuotaReservation(reservation);
    return;
  }

  await cancelAiQuotaReservation(reservation);
}

export async function runWithAiQuotaReservation<T extends UpstreamTextResult>(
  user: AiQuotaUser,
  action: string,
  execute: () => Promise<T>,
  options?: AiQuotaReservationOptions,
): Promise<T> {
  return runWithAiQuotaReservationUsingOps(user, action, execute, {
    options,
    ops: {
      reserve: reserveAiQuota,
      finalize: finalizeAiQuotaUsage,
      cancel: cancelAiQuotaReservation,
    },
  });
}

export async function runWithAiQuotaReservationUsingOps<T extends UpstreamTextResult>(
  user: AiQuotaUser,
  action: string,
  execute: () => Promise<T>,
  params: {
    options?: AiQuotaReservationOptions;
    ops: RunWithAiQuotaReservationOps;
  },
): Promise<T> {
  const reservation = await params.ops.reserve(user, action, params.options);
  let result: T;
  try {
    result = await execute();
  } catch (error) {
    await params.ops.cancel(reservation);
    throw error;
  }

  await params.ops.finalize({
    reservation,
    result,
    action,
    userId: user.id,
  });
  return result;
}

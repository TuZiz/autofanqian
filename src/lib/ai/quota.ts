import "server-only";

import { Prisma } from "@prisma/client";

import type { UpstreamTextResult } from "@/lib/ai/upstream-text";
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

type QuotaClient = typeof prisma | Prisma.TransactionClient;

const RESERVATION_TTL_MS = 5 * 60_000;

function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

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
  dailyTokenLimit: number;
  minuteCallLimit: number;
}) {
  const { client, userId, now } = params;
  const { start, end } = getTodayRange(now);
  const minuteStart = new Date(now.getTime() - 60_000);
  const reservationWhere: Prisma.AiQuotaReservationWhereInput = {
    userId,
    OR: [
      { status: "pending", expiresAt: { gt: now } },
      { status: "committed_failed" },
    ],
  };

  const [
    successCallCount,
    tokenUsage,
    pendingDailyReservations,
    pendingTokenEstimate,
    recentSuccessCount,
    pendingMinuteReservations,
    activeJobCount,
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
          where: {
            createdAt: { gte: minuteStart },
            status: { in: ["queued", "running"] },
            novel: { userId },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    activeJobs: activeJobCount,
    dailyCalls: successCallCount + pendingDailyReservations,
    dailyTokens:
      (tokenUsage._sum.totalTokens ?? 0) +
      (pendingTokenEstimate._sum.estimatedTokens ?? 0),
    minuteCalls: recentSuccessCount + pendingMinuteReservations,
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
    dailyTokenLimit,
    minuteCallLimit,
  });

  assertMembershipAiUsageAvailable(limits, usage);
}

export async function reserveAiQuota(
  user: AiQuotaUser,
  action: string,
  options?: { estimatedTokens?: number | null },
): Promise<AiQuotaReservationHandle> {
  if (isAdminUser(user)) return null;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);
  const estimatedTokens =
    typeof options?.estimatedTokens === "number" && options.estimatedTokens > 0
      ? Math.round(options.estimatedTokens)
      : null;

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        const usage = await getAiQuotaUsageSnapshot({
          client: tx,
          userId: user.id,
          now,
          dailyCallLimit: limits.dailyAiCalls,
          dailyTokenLimit: limits.dailyTokens,
          minuteCallLimit: limits.minuteAiCalls,
        });

        assertMembershipAiUsageAvailable(limits, usage);
        await assertAiActionQuotaAvailable({
          client: tx,
          user,
          action,
          now,
          limits,
        });

        return tx.aiQuotaReservation.create({
          data: {
            userId: user.id,
            action,
            estimatedTokens,
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

export async function finalizeAiQuotaUsage(params: {
  reservation: AiQuotaReservationHandle;
  result: UpstreamTextResult;
  action: string;
  userId?: string | null;
}) {
  const { reservation, result } = params;
  const shouldCreateUsageEvent =
    isSuccessfulAiResult(result) || shouldPersistFailedUsage(result);

  if (!reservation) {
    if (shouldCreateUsageEvent) {
      try {
        await prisma.aiUsageEvent.create({
          data: buildAiUsageEventData({
            userId: params.userId ?? null,
            action: params.action,
            result,
          }),
          select: { id: true },
        });
      } catch (error) {
        console.warn("Failed to log admin AI usage:", error);
      }
    }
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const currentReservation = await tx.aiQuotaReservation.findUnique({
        where: { id: reservation.id },
        select: { status: true },
      });

      if (!currentReservation || currentReservation.status !== "pending") return;

      if (shouldCreateUsageEvent) {
        await tx.aiUsageEvent.create({
          data: buildAiUsageEventData({
            userId: params.userId ?? reservation.userId,
            action: params.action,
            result,
          }),
          select: { id: true },
        });
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

    await prisma.aiQuotaReservation.updateMany({
      where: {
        id: reservation.id,
        status: "pending",
      },
      data: { status: "committed_failed" },
    });

    console.warn("Failed to finalize AI quota usage:", error);
  }
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
  options?: { estimatedTokens?: number | null },
): Promise<T> {
  const reservation = await reserveAiQuota(user, action, options);
  let result: T;
  try {
    result = await execute();
  } catch (error) {
    await cancelAiQuotaReservation(reservation);
    throw error;
  }

  await finalizeAiQuotaUsage({
    reservation,
    result,
    action,
    userId: user.id,
  });
  return result;
}

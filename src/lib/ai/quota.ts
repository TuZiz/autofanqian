import "server-only";

import { isAdminUser } from "@/lib/auth/admin";
import { getMembershipLimits } from "@/lib/membership/limits";
import {
  assertMembershipAiUsageAvailable,
  isUnlimitedMembershipLimit,
} from "@/lib/membership/rules";
import { prisma } from "@/lib/prisma";

type AiQuotaUser = {
  id: string;
  email: string;
  role?: string | null;
  membershipTier?: string | null;
};

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
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

  const { start, end } = getTodayRange();
  const minuteStart = new Date(Date.now() - 60_000);
  const [callCount, tokenUsage, recentSuccessCount, activeJobCount] = await Promise.all([
    !isUnlimitedMembershipLimit(dailyCallLimit)
      ? prisma.aiUsageEvent.count({
          where: {
            userId: user.id,
            createdAt: { gte: start, lt: end },
            success: true,
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(dailyTokenLimit)
      ? prisma.aiUsageEvent.aggregate({
          where: {
            userId: user.id,
            createdAt: { gte: start, lt: end },
            success: true,
          },
          _sum: { totalTokens: true },
        })
      : Promise.resolve({ _sum: { totalTokens: null } }),
    !isUnlimitedMembershipLimit(minuteCallLimit)
      ? prisma.aiUsageEvent.count({
          where: {
            userId: user.id,
            createdAt: { gte: minuteStart },
            success: true,
          },
        })
      : Promise.resolve(0),
    !isUnlimitedMembershipLimit(minuteCallLimit)
      ? prisma.generationJob.count({
          where: {
            createdAt: { gte: minuteStart },
            status: { in: ["queued", "running"] },
            novel: { userId: user.id },
          },
        })
      : Promise.resolve(0),
  ]);

  assertMembershipAiUsageAvailable(limits, {
    activeJobs: activeJobCount,
    dailyCalls: callCount,
    dailyTokens: tokenUsage._sum.totalTokens ?? 0,
    minuteCalls: recentSuccessCount,
  });
}

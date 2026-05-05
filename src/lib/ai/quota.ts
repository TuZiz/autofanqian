import "server-only";

import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";

type AiQuotaUser = {
  id: string;
  email: string;
  role?: string | null;
};

const DEFAULT_DAILY_CALL_LIMIT = 100;
const DEFAULT_DAILY_TOKEN_LIMIT = 300_000;

function readPositiveLimit(key: string, fallback: number) {
  const value = Number.parseInt(process.env[key] ?? "", 10);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export async function assertAiQuotaAvailable(user: AiQuotaUser) {
  if (isAdminUser(user)) return;

  const dailyCallLimit = readPositiveLimit("AI_DAILY_CALL_LIMIT", DEFAULT_DAILY_CALL_LIMIT);
  const dailyTokenLimit = readPositiveLimit("AI_DAILY_TOKEN_LIMIT", DEFAULT_DAILY_TOKEN_LIMIT);

  if (dailyCallLimit === 0 && dailyTokenLimit === 0) return;

  const { start, end } = getTodayRange();
  const [callCount, tokenUsage] = await Promise.all([
    dailyCallLimit > 0
      ? prisma.aiUsageEvent.count({
          where: {
            userId: user.id,
            createdAt: { gte: start, lt: end },
            success: true,
          },
        })
      : Promise.resolve(0),
    dailyTokenLimit > 0
      ? prisma.aiUsageEvent.aggregate({
          where: {
            userId: user.id,
            createdAt: { gte: start, lt: end },
            success: true,
          },
          _sum: { totalTokens: true },
        })
      : Promise.resolve({ _sum: { totalTokens: null } }),
  ]);

  if (dailyCallLimit > 0 && callCount >= dailyCallLimit) {
    throw new AuthApiError(429, "今日 AI 调用次数已用完，请明天再试。");
  }

  const usedTokens = tokenUsage._sum.totalTokens ?? 0;
  if (dailyTokenLimit > 0 && usedTokens >= dailyTokenLimit) {
    throw new AuthApiError(429, "今日 AI 额度已用完，请明天再试。");
  }
}

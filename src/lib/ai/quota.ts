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
const DEFAULT_MINUTE_CALL_LIMIT = 3;

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
  const minuteCallLimit = readPositiveLimit("AI_MINUTE_CALL_LIMIT", DEFAULT_MINUTE_CALL_LIMIT);

  if (dailyCallLimit === 0 && dailyTokenLimit === 0 && minuteCallLimit === 0) return;

  const { start, end } = getTodayRange();
  const minuteStart = new Date(Date.now() - 60_000);
  const [callCount, tokenUsage, recentSuccessCount, activeJobCount] = await Promise.all([
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
    minuteCallLimit > 0
      ? prisma.aiUsageEvent.count({
          where: {
            userId: user.id,
            createdAt: { gte: minuteStart },
            success: true,
          },
        })
      : Promise.resolve(0),
    minuteCallLimit > 0
      ? prisma.generationJob.count({
          where: {
            createdAt: { gte: minuteStart },
            status: { in: ["queued", "running"] },
            novel: { userId: user.id },
          },
        })
      : Promise.resolve(0),
  ]);

  if (minuteCallLimit > 0 && recentSuccessCount + activeJobCount >= minuteCallLimit) {
    throw new AuthApiError(429, "AI 请求过于频繁，请稍后再试。");
  }

  if (dailyCallLimit > 0 && callCount >= dailyCallLimit) {
    throw new AuthApiError(429, "今日 AI 调用次数已用完，请明天再试。");
  }

  const usedTokens = tokenUsage._sum.totalTokens ?? 0;
  if (dailyTokenLimit > 0 && usedTokens >= dailyTokenLimit) {
    throw new AuthApiError(429, "今日 AI 额度已用完，请明天再试。");
  }
}

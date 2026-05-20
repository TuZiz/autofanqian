import "server-only";

import type { AiUsagePeriodType, Prisma } from "@prisma/client";

import type { AiUsageLogParams } from "@/lib/ai/usage-log";
import { buildAiUsageEventData } from "@/lib/ai/usage-log";

export type UsageCounterClient = {
  aiUsageCounter: {
    findMany(args: {
      where: UsageCounterWhere;
      select: {
        requestCount: true;
        charCount: true;
        tokenCount: true;
      };
    }): Promise<Array<{ requestCount: number; charCount: number; tokenCount: number }>>;
    upsert(args: {
      where: {
        userId_periodType_periodKey_action: {
          userId: string;
          periodType: AiUsagePeriodType;
          periodKey: string;
          action: string;
        };
      };
      create: {
        userId: string;
        periodType: AiUsagePeriodType;
        periodKey: string;
        action: string;
        requestCount: number;
        charCount: number;
        tokenCount: number;
      };
      update: {
        requestCount: { increment: number };
        charCount: { increment: number };
        tokenCount: { increment: number };
      };
    }): Promise<unknown>;
  };
};

export type UsageCounterSnapshot = {
  dailyCalls: number;
  dailyGeneratedChars: number;
  dailyTokens: number;
  minuteCalls: number;
  monthlyGeneratedChars: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getAiUsagePeriodKeys(now = new Date()) {
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());

  return {
    daily: `${year}-${month}-${day}`,
    monthly: `${year}-${month}`,
    minute: `${year}-${month}-${day}T${hour}:${minute}`,
  };
}

export function buildAiUsageCounterIncrements(params: AiUsageLogParams) {
  const event = buildAiUsageEventData(params);
  if (!event.userId || !event.success) return null;

  return {
    userId: event.userId,
    action: event.action,
    requestCount: 1,
    charCount: Math.max(0, event.outputChars ?? 0),
    tokenCount: Math.max(0, event.totalTokens ?? 0),
  };
}

export async function incrementAiUsageCountersWithClient(
  client: UsageCounterClient,
  params: AiUsageLogParams,
  now = new Date(),
) {
  const increments = buildAiUsageCounterIncrements(params);
  if (!increments) return;

  const keys = getAiUsagePeriodKeys(now);
  const periods: Array<{ periodType: AiUsagePeriodType; periodKey: string }> = [
    { periodType: "minute", periodKey: keys.minute },
    { periodType: "daily", periodKey: keys.daily },
    { periodType: "monthly", periodKey: keys.monthly },
  ];

  await Promise.all(
    periods.map((period) =>
      client.aiUsageCounter.upsert({
        where: {
          userId_periodType_periodKey_action: {
            userId: increments.userId,
            periodType: period.periodType,
            periodKey: period.periodKey,
            action: increments.action,
          },
        },
        create: {
          userId: increments.userId,
          periodType: period.periodType,
          periodKey: period.periodKey,
          action: increments.action,
          requestCount: increments.requestCount,
          charCount: increments.charCount,
          tokenCount: increments.tokenCount,
        },
        update: {
          requestCount: { increment: increments.requestCount },
          charCount: { increment: increments.charCount },
          tokenCount: { increment: increments.tokenCount },
        },
      }),
    ),
  );
}

export function sumUsageCounters(
  counters: Array<{
    requestCount: number;
    charCount: number;
    tokenCount: number;
  }>,
) {
  return counters.reduce(
    (total, counter) => ({
      requestCount: total.requestCount + counter.requestCount,
      charCount: total.charCount + counter.charCount,
      tokenCount: total.tokenCount + counter.tokenCount,
    }),
    { requestCount: 0, charCount: 0, tokenCount: 0 },
  );
}

export type UsageCounterWhere = Prisma.AiUsageCounterWhereInput;

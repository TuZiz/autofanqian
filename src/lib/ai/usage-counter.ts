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

const SHANGHAI_PERIOD_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function readShanghaiPeriodPart(parts: Map<string, string>, key: string) {
  const value = parts.get(key);
  if (!value) {
    throw new Error(`Unable to resolve Asia/Shanghai period part: ${key}`);
  }
  return value;
}

export function getAiUsagePeriodKeys(now = new Date()) {
  const parts = new Map(
    SHANGHAI_PERIOD_FORMATTER.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const year = readShanghaiPeriodPart(parts, "year");
  const month = readShanghaiPeriodPart(parts, "month");
  const day = readShanghaiPeriodPart(parts, "day");
  const hour = readShanghaiPeriodPart(parts, "hour");
  const minute = readShanghaiPeriodPart(parts, "minute");

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

import {
  getAiPhysicalProviderConfigsFromEnv,
  getAiRouteConfigsFromEnv,
  getAiRouteLabel,
} from "@/backend/ai/upstream/upstream-text";
import { prisma } from "@/lib/prisma";

import {
  buildChapterMainWhere,
  buildChapterSmartRouteSummary,
  buildFallbackCountByProvider,
  buildFallbackWhere,
  buildProbeStatsByProvider,
  buildProbeWhere,
  getShanghaiDayRange,
} from "./ai-stats-queries";

export async function getAdminAiStats() {
  const range = getShanghaiDayRange();
  const providerLabelById = new Map<string, string>(
    getAiPhysicalProviderConfigsFromEnv().map((provider) => [provider.id, provider.label]),
  );
  const routeLabelById = new Map<string, string>(
    getAiRouteConfigsFromEnv().map((route) => [route.id, route.label]),
  );

  const [
    todayAgg,
    todaySuccessCount,
    todayFallbackCount,
    todayProbeAgg,
    todayFallbackByProvider,
    todayProbeByProvider,
    todayChapterMainAgg,
    todayChapterMainSuccessCount,
    todayChapterMainHitsByProvider,
    byRoute,
    byProvider,
    byAction,
    byModel,
    failureReasons,
    allTimeAgg,
    allTimeSuccessCount,
    allTimeFallbackCount,
    allTimeProbeAgg,
    allTimeChapterMainAgg,
    allTimeChapterMainSuccessCount,
    allTimeChapterMainHitsByProvider,
    allTimeByRoute,
    allTimeByModel,
  ] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    }),
    prisma.aiUsageEvent.count({
      where: { createdAt: { gte: range.start, lt: range.end }, success: true },
    }),
    prisma.aiUsageEvent.count({
      where: buildFallbackWhere(range),
    }),
    prisma.aiUsageEvent.aggregate({
      where: buildProbeWhere(range),
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["providerId", "routeId"],
      where: buildFallbackWhere(range),
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["providerId"],
      where: buildProbeWhere(range),
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.aiUsageEvent.aggregate({
      where: buildChapterMainWhere(range),
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.aiUsageEvent.count({
      where: { ...buildChapterMainWhere(range), success: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["providerId"],
      where: { ...buildChapterMainWhere(range), success: true },
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["routeId"],
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["providerId"],
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["action"],
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["modelUsed"],
      where: { createdAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["status"],
      where: { createdAt: { gte: range.start, lt: range.end }, success: false },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.aiUsageEvent.aggregate({
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    }),
    prisma.aiUsageEvent.count({
      where: { success: true },
    }),
    prisma.aiUsageEvent.count({
      where: buildFallbackWhere(),
    }),
    prisma.aiUsageEvent.aggregate({
      where: buildProbeWhere(),
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.aiUsageEvent.aggregate({
      where: buildChapterMainWhere(),
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.aiUsageEvent.count({
      where: { ...buildChapterMainWhere(), success: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["providerId"],
      where: { ...buildChapterMainWhere(), success: true },
      _count: { _all: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["routeId"],
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["modelUsed"],
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
  ]);

  const fallbackCountByProvider = buildFallbackCountByProvider(todayFallbackByProvider);
  const probeStatsByProvider = buildProbeStatsByProvider(todayProbeByProvider);
  const todayChapterMainHitMap = new Map(
    todayChapterMainHitsByProvider.map((row) => [
      row.providerId ?? "unknown",
      row._count._all ?? 0,
    ]),
  );
  const allTimeChapterMainHitMap = new Map(
    allTimeChapterMainHitsByProvider.map((row) => [
      row.providerId ?? "unknown",
      row._count._all ?? 0,
    ]),
  );

  const totalCalls = todayAgg._count._all ?? 0;
  const failedCalls = Math.max(0, totalCalls - todaySuccessCount);
  const allTimeTotalCalls = allTimeAgg._count._all ?? 0;
  const allTimeFailedCalls = Math.max(0, allTimeTotalCalls - allTimeSuccessCount);

  return {
    day: range.day,
    totalCalls,
    successCalls: todaySuccessCount,
    failedCalls,
    fallbackCount: todayFallbackCount,
    probeCount: todayProbeAgg._count._all ?? 0,
    avgProbeDurationMs: todayProbeAgg._avg.durationMs ?? null,
    chapterSmartRoute: {
      primaryLabel: providerLabelById.get("gpt_primary") ?? "xtokenmirror",
      fallbackLabel: providerLabelById.get("gpt_fallback") ?? "99dun",
      rescueLabel: providerLabelById.get("ark") ?? "豆包",
      today: buildChapterSmartRouteSummary({
        totalCalls: todayChapterMainAgg._count._all ?? 0,
        successCalls: todayChapterMainSuccessCount,
        avgDurationMs: todayChapterMainAgg._avg.durationMs ?? null,
        hitsByProvider: todayChapterMainHitMap,
      }),
      allTime: buildChapterSmartRouteSummary({
        totalCalls: allTimeChapterMainAgg._count._all ?? 0,
        successCalls: allTimeChapterMainSuccessCount,
        avgDurationMs: allTimeChapterMainAgg._avg.durationMs ?? null,
        hitsByProvider: allTimeChapterMainHitMap,
      }),
    },
    successRate: totalCalls ? Math.round((todaySuccessCount / totalCalls) * 10000) / 100 : 0,
    avgDurationMs: todayAgg._avg.durationMs ?? null,
    allTime: {
      totalCalls: allTimeTotalCalls,
      successCalls: allTimeSuccessCount,
      failedCalls: allTimeFailedCalls,
      fallbackCount: allTimeFallbackCount,
      probeCount: allTimeProbeAgg._count._all ?? 0,
      avgProbeDurationMs: allTimeProbeAgg._avg.durationMs ?? null,
      successRate: allTimeTotalCalls
        ? Math.round((allTimeSuccessCount / allTimeTotalCalls) * 10000) / 100
        : 0,
      avgDurationMs: allTimeAgg._avg.durationMs ?? null,
      tokens: {
        input: allTimeAgg._sum.inputTokens ?? 0,
        output: allTimeAgg._sum.outputTokens ?? 0,
        total: allTimeAgg._sum.totalTokens ?? 0,
      },
      byRoute: allTimeByRoute.map((row) => ({
        routeId: row.routeId ?? "unknown",
        routeLabel: row.routeId
          ? routeLabelById.get(row.routeId) ?? getAiRouteLabel(row.routeId as "gpt" | "ark")
          : undefined,
        calls: row._count._all ?? 0,
        avgDurationMs: row._avg.durationMs ?? null,
        tokens: {
          input: row._sum.inputTokens ?? 0,
          output: row._sum.outputTokens ?? 0,
          total: row._sum.totalTokens ?? 0,
        },
      })),
      byModel: allTimeByModel.map((row) => ({
        modelUsed: row.modelUsed ?? "unknown",
        calls: row._count._all ?? 0,
        avgDurationMs: row._avg.durationMs ?? null,
        tokens: {
          input: row._sum.inputTokens ?? 0,
          output: row._sum.outputTokens ?? 0,
          total: row._sum.totalTokens ?? 0,
        },
      })),
    },
    tokens: {
      input: todayAgg._sum.inputTokens ?? 0,
      output: todayAgg._sum.outputTokens ?? 0,
      total: todayAgg._sum.totalTokens ?? 0,
    },
    byRoute: byRoute.map((row) => ({
      routeId: row.routeId ?? "unknown",
      routeLabel: row.routeId
        ? routeLabelById.get(row.routeId) ?? getAiRouteLabel(row.routeId as "gpt" | "ark")
        : undefined,
      calls: row._count._all ?? 0,
      avgDurationMs: row._avg.durationMs ?? null,
      tokens: {
        input: row._sum.inputTokens ?? 0,
        output: row._sum.outputTokens ?? 0,
        total: row._sum.totalTokens ?? 0,
      },
    })),
    byModel: byModel.map((row) => ({
      modelUsed: row.modelUsed ?? "unknown",
      calls: row._count._all ?? 0,
      avgDurationMs: row._avg.durationMs ?? null,
      tokens: {
        input: row._sum.inputTokens ?? 0,
        output: row._sum.outputTokens ?? 0,
        total: row._sum.totalTokens ?? 0,
      },
    })),
    byProvider: byProvider.map((row) => ({
      providerId: row.providerId ?? "unknown",
      providerLabel:
        row.providerId && providerLabelById.has(row.providerId)
          ? providerLabelById.get(row.providerId)
          : undefined,
      calls: row._count._all ?? 0,
      avgDurationMs: row._avg.durationMs ?? null,
      probeCount: probeStatsByProvider.get(row.providerId ?? "unknown")?.count ?? 0,
      avgProbeDurationMs:
        probeStatsByProvider.get(row.providerId ?? "unknown")?.avgDurationMs ?? null,
      fallbackCount: fallbackCountByProvider.get(row.providerId ?? "unknown") ?? 0,
      tokens: {
        input: row._sum.inputTokens ?? 0,
        output: row._sum.outputTokens ?? 0,
        total: row._sum.totalTokens ?? 0,
      },
    })),
    byAction: byAction.map((row) => ({
      action: row.action,
      calls: row._count._all ?? 0,
      avgDurationMs: row._avg.durationMs ?? null,
      tokens: {
        input: row._sum.inputTokens ?? 0,
        output: row._sum.outputTokens ?? 0,
        total: row._sum.totalTokens ?? 0,
      },
    })),
    failureReasons: failureReasons.map((row) => ({
      reason: `HTTP ${row.status}`,
      calls: row._count._all ?? 0,
    })),
  };
}

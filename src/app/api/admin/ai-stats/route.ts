import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/admin";
import { getAiProvidersFromEnv } from "@/lib/ai/upstream-text";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getShanghaiDayRange(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [yearRaw, monthRaw, dayRaw] = day.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = Number(dayRaw);

  // Asia/Shanghai is fixed UTC+8 (no DST).
  const offsetMs = 8 * 60 * 60 * 1000;
  const startUtcMs = Date.UTC(year, month - 1, date, 0, 0, 0) - offsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return { day, start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

export async function GET() {
  await requireAdminUser();

  const range = getShanghaiDayRange();
  const providerLabelById = new Map<string, string>(
    getAiProvidersFromEnv().map((provider) => [provider.id, provider.model]),
  );

  try {
    const [
      todayAgg,
      todaySuccessCount,
      byProvider,
      byAction,
      byModel,
      allTimeAgg,
      allTimeSuccessCount,
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
      prisma.aiUsageEvent.groupBy({
        by: ["modelUsed"],
        _count: { _all: true },
        _avg: { durationMs: true },
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
        orderBy: { _sum: { totalTokens: "desc" } },
      }),
    ]);

    const totalCalls = todayAgg._count._all ?? 0;
    const failedCalls = Math.max(0, totalCalls - todaySuccessCount);

    const allTimeTotalCalls = allTimeAgg._count._all ?? 0;
    const allTimeFailedCalls = Math.max(0, allTimeTotalCalls - allTimeSuccessCount);

    return NextResponse.json({
      success: true,
      message: "OK",
      data: {
        day: range.day,
        totalCalls,
        successCalls: todaySuccessCount,
        failedCalls,
        avgDurationMs: todayAgg._avg.durationMs ?? null,
        allTime: {
          totalCalls: allTimeTotalCalls,
          successCalls: allTimeSuccessCount,
          failedCalls: allTimeFailedCalls,
          avgDurationMs: allTimeAgg._avg.durationMs ?? null,
          tokens: {
            input: allTimeAgg._sum.inputTokens ?? 0,
            output: allTimeAgg._sum.outputTokens ?? 0,
            total: allTimeAgg._sum.totalTokens ?? 0,
          },
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
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          "统计服务未初始化或数据库未迁移完成。请先运行一键启动脚本（start-dev.cmd）或执行 prisma migrate deploy。",
      },
      { status: 500 },
    );
  }
}

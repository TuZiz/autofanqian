export type AiStatsDayRange = {
  day: string;
  end: Date;
  start: Date;
};

export function getShanghaiDayRange(now = new Date()): AiStatsDayRange {
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

  const offsetMs = 8 * 60 * 60 * 1000;
  const startUtcMs = Date.UTC(year, month - 1, date, 0, 0, 0) - offsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return { day, start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

export function buildProbeWhere(range?: { start: Date; end: Date }) {
  return {
    ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    OR: [
      { action: "chapter.generate.probe" },
      { action: "chapter.generate.stream.probe" },
      {
        action: {
          startsWith: "chapter_generate_",
          endsWith: "_probe",
        },
      },
      {
        action: {
          startsWith: "chapter_generate_stream_",
          endsWith: "_probe",
        },
      },
    ],
  };
}

export function buildFallbackWhere(range?: { start: Date; end: Date }) {
  return {
    ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    OR: [
      {
        routeId: "gpt",
        providerId: { not: "gpt_primary" },
      },
      {
        routeId: "ark",
        providerId: { not: "ark" },
      },
    ],
  };
}

export function buildChapterMainWhere(range?: { start: Date; end: Date }) {
  return {
    ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    OR: [
      { action: "chapter.generate" },
      { action: "chapter.generate.stream" },
      {
        action: {
          startsWith: "chapter_generate_",
          not: { contains: "_probe" },
        },
      },
      {
        action: {
          startsWith: "chapter_generate_stream_",
          not: { contains: "_probe" },
        },
      },
    ],
    NOT: [
      { action: { contains: "_length_repair_" } },
      { action: { endsWith: "_probe" } },
    ],
  };
}

export function buildFallbackCountByProvider(
  rows: Array<{
    providerId: string | null;
    routeId: string | null;
    _count: { _all: number };
  }>,
) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const providerId = row.providerId ?? "unknown";
    const routeId = row.routeId ?? "";
    const isFallback =
      (routeId === "gpt" && providerId !== "gpt_primary") ||
      (routeId === "ark" && providerId !== "ark");

    if (!isFallback) continue;
    counts.set(providerId, (counts.get(providerId) ?? 0) + (row._count._all ?? 0));
  }

  return counts;
}

export function buildProbeStatsByProvider(
  rows: Array<{
    providerId: string | null;
    _count: { _all: number };
    _avg: { durationMs: number | null };
  }>,
) {
  const stats = new Map<string, { count: number; avgDurationMs: number | null }>();

  for (const row of rows) {
    stats.set(row.providerId ?? "unknown", {
      count: row._count._all ?? 0,
      avgDurationMs: row._avg.durationMs ?? null,
    });
  }

  return stats;
}

export function buildChapterSmartRouteSummary(input: {
  totalCalls: number;
  successCalls: number;
  avgDurationMs: number | null;
  hitsByProvider: Map<string, number>;
}) {
  const primaryHits = input.hitsByProvider.get("gpt_primary") ?? 0;
  const fallbackHits = input.hitsByProvider.get("gpt_fallback") ?? 0;
  const rescueHits = input.hitsByProvider.get("ark") ?? 0;

  return {
    totalCalls: input.totalCalls,
    successCalls: input.successCalls,
    avgDurationMs: input.avgDurationMs,
    primaryHits,
    primaryHitRate:
      input.successCalls > 0
        ? Math.round((primaryHits / input.successCalls) * 10000) / 100
        : 0,
    fallbackHits,
    rescueHits,
  };
}

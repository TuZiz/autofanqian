"use client";

import { AlertCircle, BarChart3, CheckCircle2, Clock, Timer } from "lucide-react";

import { formatCompactNumber, formatDuration, formatTokens } from "@/lib/admin/admin-format";
import type { GenerationLogsResponse } from "@/lib/admin/generation-log-types";
import { cn } from "@/lib/utils";

import { GenerationLogStatusBars } from "./generation-log-status-bars";

type Props = {
  data: GenerationLogsResponse | null;
};

export function GenerationLogSummaryCard({ data }: Props) {
  const summary = data?.summary;
  const today = data?.today;
  const successRate = summary?.successRate ?? 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="overflow-hidden rounded-[18px] border border-[#d9e5f2] bg-white shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
        <div className="border-b border-[#eef3f8] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
            最近 60 次生成表现
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[34px] font-black leading-none tracking-tight text-[#0f172a]">
                {successRate}%
              </p>
              <p className="mt-1 text-sm font-semibold text-[#52647e]">
                成功率 · 最近 {summary?.latestWindowSize ?? 0} 次任务
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
              <MiniMetric label="成功" value={summary?.successCount ?? 0} tone="success" />
              <MiniMetric label="失败" value={summary?.failedCount ?? 0} tone="danger" />
              <MiniMetric label="运行" value={summary?.runningCount ?? 0} tone="brand" />
              <MiniMetric label="排队" value={summary?.queuedCount ?? 0} tone="neutral" />
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <GenerationLogStatusBars bars={summary?.bars ?? []} />
          <div className="rounded-xl border border-[#f3d5d5] bg-[#fff7f7] px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b42318]" />
              <div className="min-w-0">
                <p className="text-xs font-black text-[#9f1d16]">最近失败提示</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#6b2a24]">
                  {summary?.latestFailedMessage || "最近没有失败记录。"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatTile
          icon={BarChart3}
          label="全部任务"
          value={formatCompactNumber(totalFromCounts(data))}
          helper={`今日 ${formatCompactNumber(today?.total ?? 0)}`}
        />
        <StatTile
          icon={CheckCircle2}
          label="今日成功率"
          value={`${today?.successRate ?? 0}%`}
          helper={`成功 ${today?.success ?? 0} / 失败 ${today?.failed ?? 0}`}
        />
        <StatTile
          icon={Timer}
          label="平均耗时"
          value={formatDuration(today?.avgDurationMs ?? null)}
          helper="按今日任务统计"
        />
        <StatTile
          icon={Clock}
          label="总 Token"
          value={formatTokens(today?.totalTokens ?? 0)}
          helper="今日任务消耗"
        />
      </section>
    </div>
  );
}

function MiniMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "brand" | "danger" | "neutral" | "success";
  value: number;
}) {
  const tones = {
    brand: "text-[#1268c3]",
    danger: "text-[#b42318]",
    neutral: "text-[#64748b]",
    success: "text-[#047857]",
  };

  return (
    <div>
      <p className={cn("text-lg font-black leading-none", tones[tone])}>{value}</p>
      <p className="mt-1 text-[11px] font-bold text-[#7b8ca5]">{label}</p>
    </div>
  );
}

function StatTile({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#d9e5f2] bg-white p-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7b8ca5]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-[#0f172a]">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-[#52647e]">{helper}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-[#1687f2] ring-1 ring-[#cfe3fb]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

function totalFromCounts(data: GenerationLogsResponse | null) {
  return (data?.counts ?? []).reduce((total, item) => total + item.count, 0);
}

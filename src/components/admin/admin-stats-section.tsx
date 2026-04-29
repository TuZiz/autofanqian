"use client";

import { Activity, BarChart3, Clock3, RefreshCw, Server, Timer, Zap, type LucideIcon } from "lucide-react";

import { formatDurationMs, formatNumber } from "@/lib/admin/dashboard-admin-format";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

type AdminStatsSectionProps = {
  admin: DashboardAdminController;
};

export function AdminStatsSection({ admin }: AdminStatsSectionProps) {
  const { aiStats, aiStatsLoading, handleRefreshAiStats } = admin;
  const todaySuccessRate = getRate(aiStats?.successCalls ?? 0, aiStats?.totalCalls ?? 0);
  const allSuccessRate = getRate(aiStats?.allTime.successCalls ?? 0, aiStats?.allTime.totalCalls ?? 0);

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              实时 AI 数据监控
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              今日数据、累计消耗、服务商和模型排行一屏扫清。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefreshAiStats}
          disabled={aiStatsLoading}
          className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={aiStatsLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {aiStatsLoading ? "刷新中..." : "手动刷新"}
        </button>
      </div>

      <div className="grid gap-0 divide-y divide-slate-100 dark:divide-white/10 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.85fr)] xl:divide-x xl:divide-y-0">
        <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">
          <MetricTile
            icon={Zap}
            label="今日调用"
            value={formatNumber(aiStats?.totalCalls ?? 0)}
            detail={`成功 ${formatNumber(aiStats?.successCalls ?? 0)} / 失败 ${formatNumber(aiStats?.failedCalls ?? 0)}`}
            meta={`成功率 ${todaySuccessRate}`}
            tone="emerald"
          />
          <MetricTile
            icon={BarChart3}
            label="今日 Token"
            value={formatNumber(aiStats?.tokens.total ?? 0)}
            detail={`输入 ${formatNumber(aiStats?.tokens.input ?? 0)} / 输出 ${formatNumber(aiStats?.tokens.output ?? 0)}`}
            meta={`均耗时 ${formatDurationMs(aiStats?.avgDurationMs)}`}
            tone="sky"
          />
          <MetricTile
            icon={Server}
            label="总调用"
            value={formatNumber(aiStats?.allTime.totalCalls ?? 0)}
            detail={`成功 ${formatNumber(aiStats?.allTime.successCalls ?? 0)} / 失败 ${formatNumber(aiStats?.allTime.failedCalls ?? 0)}`}
            meta={`成功率 ${allSuccessRate}`}
            tone="amber"
          />
          <MetricTile
            icon={Timer}
            label="总 Token"
            value={formatNumber(aiStats?.allTime.tokens.total ?? 0)}
            detail={`输入 ${formatNumber(aiStats?.allTime.tokens.input ?? 0)} / 输出 ${formatNumber(aiStats?.allTime.tokens.output ?? 0)}`}
            meta={`均耗时 ${formatDurationMs(aiStats?.allTime.avgDurationMs)}`}
            tone="slate"
          />
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-1">
          <RankPanel
            icon={Server}
            title="今日服务商排行"
            empty="暂无今日调用"
            rows={(aiStats?.byProvider ?? []).slice(0, 4).map((row) => ({
              id: row.providerId,
              label: row.providerLabel ?? row.providerId,
              calls: row.calls,
              tokens: row.tokens.total,
              duration: row.avgDurationMs,
            }))}
          />
          <RankPanel
            icon={Clock3}
            title="累计模型排行"
            empty="暂无模型消耗"
            rows={(aiStats?.allTime.byModel ?? []).slice(0, 5).map((row) => ({
              id: row.modelUsed,
              label: row.modelUsed,
              calls: row.calls,
              tokens: row.tokens.total,
              duration: row.avgDurationMs,
            }))}
          />
        </div>
      </div>
    </section>
  );
}

type MetricTileProps = {
  detail: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  tone: "amber" | "emerald" | "sky" | "slate";
  value: string;
};

function MetricTile({ detail, icon: Icon, label, meta, tone, value }: MetricTileProps) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-300/20",
    emerald:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-300/20",
    sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-300/20",
    slate:
      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/[0.04] dark:text-slate-200 dark:border-white/10",
  }[tone];

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 truncate text-xs font-bold text-slate-600 dark:text-slate-300">{detail}</div>
      <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
        {meta}
      </div>
    </article>
  );
}

type RankPanelProps = {
  empty: string;
  icon: LucideIcon;
  rows: Array<{ id: string; label: string; calls: number; tokens: number; duration: number | null }>;
  title: string;
};

function RankPanel({ empty, icon: Icon, rows, title }: RankPanelProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <span className="text-xs font-black text-slate-400">#{index + 1}</span>
            <span className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
              {row.label}
            </span>
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                {formatNumber(row.calls)} 次
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                {formatNumber(row.tokens)} Token
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                均 {formatDurationMs(row.duration)}
              </span>
            </div>
          </div>
        ))}
        {!rows.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-5 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            {empty}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getRate(success: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((success / total) * 100)}%`;
}

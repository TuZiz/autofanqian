"use client";

import {
  Activity,
  BarChart3,
  Clock3,
  Crown,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  ShieldPlus,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { formatDurationMs, formatNumber } from "@/lib/admin/dashboard-admin-format";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

type AdminStatsSectionProps = {
  admin: DashboardAdminController;
};

export function AdminStatsSection({ admin }: AdminStatsSectionProps) {
  const { aiStats, aiStatsLoading, handleRefreshAiStats } = admin;
  const todaySuccessRate = getRate(aiStats?.successCalls ?? 0, aiStats?.totalCalls ?? 0);
  const allSuccessRate = getRate(
    aiStats?.allTime.successCalls ?? 0,
    aiStats?.allTime.totalCalls ?? 0,
  );

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-stone-950">
      <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-stone-950 dark:text-stone-50">
              实时 AI 数据监控
            </h2>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              今日数据、累计消耗、逻辑路线与物理端点命中一屏看完。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefreshAiStats}
          disabled={aiStatsLoading}
          className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={aiStatsLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {aiStatsLoading ? "刷新中..." : "手动刷新"}
        </button>
      </div>

      <div className="border-b border-stone-100 px-4 py-4 dark:border-white/10">
        <ChapterSmartRoutePanel admin={admin} />
      </div>

      <div className="grid gap-0 divide-y divide-stone-100 dark:divide-white/10 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.85fr)] xl:divide-x xl:divide-y-0">
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
            meta={`Fallback ${formatNumber(aiStats?.fallbackCount ?? 0)} / 探针 ${formatNumber(aiStats?.probeCount ?? 0)} 次 / 探针均耗时 ${formatDurationMs(aiStats?.avgProbeDurationMs)}`}
            tone="sky"
          />
          <MetricTile
            icon={Server}
            label="累计调用"
            value={formatNumber(aiStats?.allTime.totalCalls ?? 0)}
            detail={`成功 ${formatNumber(aiStats?.allTime.successCalls ?? 0)} / 失败 ${formatNumber(aiStats?.allTime.failedCalls ?? 0)}`}
            meta={`成功率 ${allSuccessRate}`}
            tone="amber"
          />
          <MetricTile
            icon={Timer}
            label="累计 Token"
            value={formatNumber(aiStats?.allTime.tokens.total ?? 0)}
            detail={`输入 ${formatNumber(aiStats?.allTime.tokens.input ?? 0)} / 输出 ${formatNumber(aiStats?.allTime.tokens.output ?? 0)}`}
            meta={`Fallback ${formatNumber(aiStats?.allTime.fallbackCount ?? 0)} / 探针 ${formatNumber(aiStats?.allTime.probeCount ?? 0)} 次 / 探针均耗时 ${formatDurationMs(aiStats?.allTime.avgProbeDurationMs)}`}
            tone="slate"
          />
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-1">
          <RankPanel
            icon={Route}
            title="今日逻辑路线排行"
            empty="暂无今日路线调用"
            rows={(aiStats?.byRoute ?? []).slice(0, 4).map((row) => ({
              id: row.routeId,
              label: row.routeLabel ?? row.routeId,
              calls: row.calls,
              tokens: row.tokens.total,
              duration: row.avgDurationMs,
            }))}
          />
          <RankPanel
            icon={Server}
            title="今日物理端点排行"
            empty="暂无今日端点调用"
            rows={(aiStats?.byProvider ?? []).slice(0, 4).map((row) => ({
              id: row.providerId,
              label:
                (row.providerLabel ?? row.providerId) +
                `${row.fallbackCount ? ` / fallback ${formatNumber(row.fallbackCount)}` : ""}` +
                `${row.probeCount ? ` / probe ${formatNumber(row.probeCount)}` : ""}`,
              calls: row.calls,
              tokens: row.tokens.total,
              duration: row.avgDurationMs,
            }))}
          />
          <RankPanel
            icon={Route}
            title="累计逻辑路线排行"
            empty="暂无累计路线数据"
            rows={(aiStats?.allTime.byRoute ?? []).slice(0, 4).map((row) => ({
              id: row.routeId,
              label: row.routeLabel ?? row.routeId,
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

function ChapterSmartRoutePanel({ admin }: AdminStatsSectionProps) {
  const stats = admin.aiStats?.chapterSmartRoute;
  const today = stats?.today;
  const allTime = stats?.allTime;

  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300">
            <Route className="h-3.5 w-3.5" />
            正文专项卡片
          </div>
          <h3 className="mt-2 text-base font-extrabold text-stone-950 dark:text-stone-50">
            正文智能链命中情况
          </h3>
          <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
            {stats
              ? `${stats.primaryLabel} -> ${stats.fallbackLabel} -> ${stats.rescueLabel}`
              : "xtokenmirror -> 99dun -> 豆包"}
          </p>
        </div>
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
          只统计正文主生成与流式正文主生成，不含探针和字数修复
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <CompactStatCard
          title="今日正文主链"
          subtitle={`成功 ${formatNumber(today?.successCalls ?? 0)} / 总计 ${formatNumber(today?.totalCalls ?? 0)}`}
          meta={`均耗时 ${formatDurationMs(today?.avgDurationMs)}`}
          items={[
            {
              icon: Crown,
              label: `${stats?.primaryLabel ?? "xtokenmirror"} 命中率`,
              value: `${today?.primaryHitRate ?? 0}%`,
            },
            {
              icon: ShieldPlus,
              label: `${stats?.fallbackLabel ?? "99dun"} 接管次数`,
              value: formatNumber(today?.fallbackHits ?? 0),
            },
            {
              icon: ShieldCheck,
              label: `${stats?.rescueLabel ?? "豆包"} 兜底次数`,
              value: formatNumber(today?.rescueHits ?? 0),
            },
          ]}
        />
        <CompactStatCard
          title="累计正文主链"
          subtitle={`成功 ${formatNumber(allTime?.successCalls ?? 0)} / 总计 ${formatNumber(allTime?.totalCalls ?? 0)}`}
          meta={`均耗时 ${formatDurationMs(allTime?.avgDurationMs)}`}
          items={[
            {
              icon: Crown,
              label: `${stats?.primaryLabel ?? "xtokenmirror"} 命中率`,
              value: `${allTime?.primaryHitRate ?? 0}%`,
            },
            {
              icon: ShieldPlus,
              label: `${stats?.fallbackLabel ?? "99dun"} 接管次数`,
              value: formatNumber(allTime?.fallbackHits ?? 0),
            },
            {
              icon: ShieldCheck,
              label: `${stats?.rescueLabel ?? "豆包"} 兜底次数`,
              value: formatNumber(allTime?.rescueHits ?? 0),
            },
          ]}
        />
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
    amber:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-300/20",
    emerald:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-300/20",
    sky:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-300/20",
    slate:
      "bg-stone-50 text-stone-700 border-stone-200 dark:bg-white/[0.04] dark:text-stone-200 dark:border-white/10",
  }[tone];

  return (
    <article className="rounded-lg border border-stone-200 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400">{label}</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-50">
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 truncate text-xs font-bold text-stone-600 dark:text-stone-300">{detail}</div>
      <div className="mt-2 inline-flex rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
        {meta}
      </div>
    </article>
  );
}

function CompactStatCard({
  title,
  subtitle,
  meta,
  items,
}: {
  title: string;
  subtitle: string;
  meta: string;
  items: Array<{ icon: LucideIcon; label: string; value: string }>;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-stone-950 dark:text-stone-50">{title}</h4>
          <p className="mt-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
            {subtitle}
          </p>
        </div>
        <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-bold text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
          {meta}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-bold">{item.label}</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-stone-950 dark:text-stone-50">
                {item.value}
              </div>
            </div>
          );
        })}
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
    <article className="rounded-lg border border-stone-200 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400" />
        <h3 className="text-sm font-bold text-stone-950 dark:text-stone-50">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <span className="text-xs font-bold text-stone-500">#{index + 1}</span>
            <span className="truncate text-sm font-bold text-stone-800 dark:text-stone-100">
              {row.label}
            </span>
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600 dark:bg-white/[0.08] dark:text-stone-300">
                {formatNumber(row.calls)} 次
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600 dark:bg-white/[0.08] dark:text-stone-300">
                {formatNumber(row.tokens)} Token
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600 dark:bg-white/[0.08] dark:text-stone-300">
                均 {formatDurationMs(row.duration)}
              </span>
            </div>
          </div>
        ))}
        {!rows.length ? (
          <div className="rounded-lg border border-dashed border-stone-200 py-5 text-center text-sm font-bold text-stone-500 dark:border-white/10">
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

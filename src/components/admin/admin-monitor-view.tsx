"use client";

import {
  Activity,
  BarChart3,
  Crown,
  LineChart,
  Radar,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  ShieldPlus,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/design-system";
import { formatDurationMs, formatNumber } from "@/lib/admin/dashboard-admin-format";
import type { AdminMonitorController } from "@/lib/admin/use-admin-monitor";

import {
  AdminEmptyStateCard,
  AdminFormGroup,
  AdminRankingRow,
  AdminStatCard,
  AdminStatusPill,
} from "./admin-console-primitives";
import {
  AdminLeftNav,
  AdminWorkspaceLayout,
  AdminWorkspaceShell,
} from "./admin-workspace-shell";

const AI_ROUTE_CHART_INITIAL_DIMENSION = { width: 720, height: 300 };

const MONITOR_NAV_ITEMS = [
  { description: "今日核心数据概览", icon: Activity, id: "overview", title: "今日概览" },
  { description: "逻辑线调用图表", icon: Route, id: "routes", title: "路线调用" },
  { description: "物理端点调用排行", icon: Server, id: "providers", title: "端点调用" },
  { description: "累计模型消耗排行", icon: Crown, id: "models", title: "模型排行" },
  { description: "累计逻辑线排行", icon: Radar, id: "route-rank", title: "逻辑线排行" },
];

type AdminMonitorViewProps = {
  monitor: AdminMonitorController;
};

export function AdminMonitorView({ monitor }: AdminMonitorViewProps) {
  const { aiStats, aiStatsLoading, handleRefreshAiStats, user } = monitor;
  const todaySuccessRate = getRate(aiStats?.successCalls ?? 0, aiStats?.totalCalls ?? 0);
  const allSuccessRate = getRate(
    aiStats?.allTime.successCalls ?? 0,
    aiStats?.allTime.totalCalls ?? 0,
  );
  const routeChartData =
    aiStats?.byRoute.slice(0, 6).map((row) => ({
      name: row.routeLabel ?? row.routeId,
      calls: row.calls,
      tokens: row.tokens.total,
    })) ?? [];

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "实时监控" }]}
      description="监控 / AI 调用数据"
      icon={Activity}
      subtitle="今日调用、累计消耗、逻辑线路径、物理端点和正文智能链命中都在这里集中展示。"
      title="实时 AI 监控"
      userEmail={user?.email ?? ""}
      meta={
        <>
          {aiStatsLoading ? <AdminStatusPill tone="brand">刷新中</AdminStatusPill> : null}
          <Button
            type="button"
            icon={RefreshCw}
            busy={aiStatsLoading}
            onClick={handleRefreshAiStats}
            className="min-h-9 px-3"
          >
            刷新数据
          </Button>
        </>
      }
    >
      <AdminWorkspaceLayout
        leftNav={
          <AdminLeftNav
            activeId={monitor.activeSection}
            items={MONITOR_NAV_ITEMS}
            onSelect={monitor.setActiveSection}
          />
        }
      >
        <div className="space-y-4">
          {monitor.activeSection === "overview" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                  description={`成功 ${formatNumber(aiStats?.successCalls ?? 0)} / 失败 ${formatNumber(aiStats?.failedCalls ?? 0)}`}
                  icon={Zap}
                  label="今日调用"
                  tone="success"
                  trend={`成功率 ${todaySuccessRate}`}
                  value={formatNumber(aiStats?.totalCalls ?? 0)}
                />
                <AdminStatCard
                  description={`输入 ${formatNumber(aiStats?.tokens.input ?? 0)} / 输出 ${formatNumber(aiStats?.tokens.output ?? 0)}`}
                  icon={BarChart3}
                  label="今日 Token"
                  tone="ai"
                  trend={`Fallback ${formatNumber(aiStats?.fallbackCount ?? 0)}`}
                  value={formatNumber(aiStats?.tokens.total ?? 0)}
                />
                <AdminStatCard
                  description={`成功 ${formatNumber(aiStats?.allTime.successCalls ?? 0)} / 失败 ${formatNumber(aiStats?.allTime.failedCalls ?? 0)}`}
                  icon={Server}
                  label="累计调用"
                  tone="warning"
                  trend={`成功率 ${allSuccessRate}`}
                  value={formatNumber(aiStats?.allTime.totalCalls ?? 0)}
                />
                <AdminStatCard
                  description={`输入 ${formatNumber(aiStats?.allTime.tokens.input ?? 0)} / 输出 ${formatNumber(aiStats?.allTime.tokens.output ?? 0)}`}
                  icon={Timer}
                  label="累计 Token"
                  tone="brand"
                  trend={`Probe 均耗时 ${formatDurationMs(aiStats?.allTime.avgProbeDurationMs)}`}
                  value={formatNumber(aiStats?.allTime.tokens.total ?? 0)}
                />
              </div>
              <ChapterSmartRoutePanel aiStats={aiStats} />
            </>
          ) : null}

          {monitor.activeSection === "routes" ? (
            <AiRouteChart
              data={routeChartData}
              loading={aiStatsLoading}
              onRefresh={handleRefreshAiStats}
            />
          ) : null}

          {monitor.activeSection === "providers" ? (
            <RankPanel
              icon={Server}
              title="今日物理端点排行"
              emptyTitle="今日暂无端点调用"
              emptyDescription="当逻辑线落到具体提供方后，这里会显示真实端点的调用情况。"
              onRefresh={handleRefreshAiStats}
              rows={(aiStats?.byProvider ?? []).slice(0, 6).map((row) => ({
                id: row.providerId,
                title: row.providerLabel ?? row.providerId,
                subtitle: buildProviderSubtitle(row),
                metrics: [
                  { label: "调用", value: `${formatNumber(row.calls)} 次` },
                  { label: "Token", value: formatNumber(row.tokens.total) },
                  { label: "均耗时", value: formatDurationMs(row.avgDurationMs) },
                ],
              }))}
            />
          ) : null}

          {monitor.activeSection === "models" ? (
            <RankPanel
              icon={LineChart}
              title="累计模型排行"
              emptyTitle="暂无模型消耗数据"
              emptyDescription="当模型被真实命中后，这里会逐步形成稳定的累计消耗排行榜。"
              onRefresh={handleRefreshAiStats}
              rows={(aiStats?.allTime.byModel ?? []).slice(0, 6).map((row) => ({
                id: row.modelUsed,
                title: row.modelUsed,
                subtitle: "按模型维度聚合",
                metrics: [
                  { label: "调用", value: `${formatNumber(row.calls)} 次` },
                  { label: "Token", value: formatNumber(row.tokens.total) },
                  { label: "均耗时", value: formatDurationMs(row.avgDurationMs) },
                ],
              }))}
            />
          ) : null}

          {monitor.activeSection === "route-rank" ? (
            <>
              <RankPanel
                icon={Route}
                title="今日逻辑线排行"
                emptyTitle="今日暂无逻辑线调用"
                emptyDescription="当有创作请求进入后，这里会按逻辑线展示调用量、Token 与平均耗时。"
                onRefresh={handleRefreshAiStats}
                rows={(aiStats?.byRoute ?? []).slice(0, 4).map((row) => ({
                  id: row.routeId,
                  title: row.routeLabel ?? row.routeId,
                  subtitle: row.routeId,
                  metrics: [
                    { label: "调用", value: `${formatNumber(row.calls)} 次` },
                    { label: "Token", value: formatNumber(row.tokens.total) },
                    { label: "均耗时", value: formatDurationMs(row.avgDurationMs) },
                  ],
                }))}
              />
              <RankPanel
                icon={Radar}
                title="累计逻辑线排行"
                emptyTitle="暂无累计逻辑线数据"
                emptyDescription="累计数据会随着时间沉淀，适合观察长期热路径与异常增长。"
                onRefresh={handleRefreshAiStats}
                rows={(aiStats?.allTime.byRoute ?? []).slice(0, 4).map((row) => ({
                  id: row.routeId,
                  title: row.routeLabel ?? row.routeId,
                  subtitle: row.routeId,
                  metrics: [
                    { label: "调用", value: `${formatNumber(row.calls)} 次` },
                    { label: "Token", value: formatNumber(row.tokens.total) },
                    { label: "均耗时", value: formatDurationMs(row.avgDurationMs) },
                  ],
                }))}
              />
            </>
          ) : null}
        </div>
      </AdminWorkspaceLayout>
    </AdminWorkspaceShell>
  );
}

function ChapterSmartRoutePanel({ aiStats }: { aiStats: AdminMonitorController["aiStats"] }) {
  const stats = aiStats?.chapterSmartRoute;
  const today = stats?.today;
  const allTime = stats?.allTime;

  return (
    <AdminFormGroup
      title="正文智能链命中情况"
      description="这里专门观察正文主生成链路，不含探针与字数修复，便于判断主链、Fallback 和兜底命中是否健康。"
      badge={<AdminStatusPill tone="brand">正文专属视图</AdminStatusPill>}
    >
      <div className="grid gap-3 xl:grid-cols-2">
        <SmartRouteSnapshot
          title="今日正文主链"
          subtitle={`成功 ${formatNumber(today?.successCalls ?? 0)} / 总计 ${formatNumber(today?.totalCalls ?? 0)}`}
          meta={`均耗时 ${formatDurationMs(today?.avgDurationMs)}`}
          items={[
            {
              icon: Crown,
              label: `${stats?.primaryLabel ?? "主链"} 命中率`,
              value: `${today?.primaryHitRate ?? 0}%`,
            },
            {
              icon: ShieldPlus,
              label: `${stats?.fallbackLabel ?? "Fallback"} 接管次数`,
              value: formatNumber(today?.fallbackHits ?? 0),
            },
            {
              icon: ShieldCheck,
              label: `${stats?.rescueLabel ?? "兜底"} 兜底次数`,
              value: formatNumber(today?.rescueHits ?? 0),
            },
          ]}
        />
        <SmartRouteSnapshot
          title="累计正文主链"
          subtitle={`成功 ${formatNumber(allTime?.successCalls ?? 0)} / 总计 ${formatNumber(allTime?.totalCalls ?? 0)}`}
          meta={`均耗时 ${formatDurationMs(allTime?.avgDurationMs)}`}
          items={[
            {
              icon: Crown,
              label: `${stats?.primaryLabel ?? "主链"} 命中率`,
              value: `${allTime?.primaryHitRate ?? 0}%`,
            },
            {
              icon: ShieldPlus,
              label: `${stats?.fallbackLabel ?? "Fallback"} 接管次数`,
              value: formatNumber(allTime?.fallbackHits ?? 0),
            },
            {
              icon: ShieldCheck,
              label: `${stats?.rescueLabel ?? "兜底"} 兜底次数`,
              value: formatNumber(allTime?.rescueHits ?? 0),
            },
          ]}
        />
      </div>
    </AdminFormGroup>
  );
}

function SmartRouteSnapshot({
  items,
  meta,
  subtitle,
  title,
}: {
  items: Array<{ icon: LucideIcon; label: string; value: string }>;
  meta: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.88)] p-4 shadow-[var(--theme-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[var(--theme-text-strong)]">{title}</h3>
          <p className="mt-1 text-[13px] font-semibold text-[var(--theme-text-secondary)]">
            {subtitle}
          </p>
        </div>
        <AdminStatusPill tone="neutral">{meta}</AdminStatusPill>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-3"
            >
              <div className="flex items-center gap-2 text-[var(--theme-text-muted)]">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-bold">{item.label}</span>
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.03em] text-[var(--theme-text-strong)]">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AiRouteChart({
  data,
  loading,
  onRefresh,
}: {
  data: Array<{ name: string; calls: number; tokens: number }>;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <AdminFormGroup
      title="今日路线调用图"
      description="按逻辑线路径展示今日调用量和 Token 消耗，方便快速识别突发增长与热点路径。"
      badge={loading ? <AdminStatusPill tone="brand">刷新中</AdminStatusPill> : undefined}
    >
      <div className="h-[320px] min-w-0">
        {data.length ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={300}
            initialDimension={AI_ROUTE_CHART_INITIAL_DIMENSION}
          >
            <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--theme-divider)" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--theme-text-muted)", fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--theme-text-muted)", fontSize: 11, fontWeight: 700 }}
              />
              <Tooltip
                cursor={{ fill: "var(--theme-surface-hover)" }}
                contentStyle={{
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid var(--theme-border)",
                  borderRadius: "18px",
                  color: "var(--theme-text-primary)",
                  boxShadow: "var(--theme-shadow-card)",
                }}
              />
              <Bar dataKey="calls" name="调用" fill="var(--theme-brand-500)" radius={[10, 10, 0, 0]} />
              <Bar dataKey="tokens" name="Token" fill="var(--theme-brand-700)" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <AdminEmptyStateCard
            className="h-full"
            icon={LineChart}
            title="今日暂无路线调用"
            description="当有创作请求进入逻辑线后，这里会自动生成柱状图。"
            action={
              <Button type="button" icon={RefreshCw} onClick={onRefresh}>
                手动刷新
              </Button>
            }
          />
        )}
      </div>
    </AdminFormGroup>
  );
}

function RankPanel({
  emptyDescription,
  emptyTitle,
  icon,
  onRefresh,
  rows,
  title,
}: {
  emptyDescription: string;
  emptyTitle: string;
  icon: LucideIcon;
  onRefresh: () => void;
  rows: Array<{
    id: string;
    metrics: Array<{ label: string; value: string }>;
    subtitle?: string;
    title: string;
  }>;
  title: string;
}) {
  return (
    <AdminFormGroup
      title={title}
      description="统一用胶囊信息展示调用次数、Token 与平均耗时。"
      badge={<AdminStatusPill tone="neutral">Top {Math.max(rows.length, 4)}</AdminStatusPill>}
    >
      <div className="space-y-3">
        {rows.length ? (
          rows.map((row, index) => (
            <AdminRankingRow
              key={row.id}
              rank={index + 1}
              subtitle={row.subtitle}
              title={row.title}
              metrics={row.metrics}
            />
          ))
        ) : (
          <AdminEmptyStateCard
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Button type="button" icon={RefreshCw} onClick={onRefresh}>
                手动刷新
              </Button>
            }
          />
        )}
      </div>
    </AdminFormGroup>
  );
}

function buildProviderSubtitle(row: {
  fallbackCount?: number;
  probeCount?: number;
  providerId: string;
}) {
  const details = [
    row.fallbackCount ? `fallback ${formatNumber(row.fallbackCount)}` : null,
    row.probeCount ? `probe ${formatNumber(row.probeCount)}` : null,
  ].filter(Boolean);

  return details.length ? `${row.providerId} · ${details.join(" / ")}` : row.providerId;
}

function getRate(success: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((success / total) * 100)}%`;
}

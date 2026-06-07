"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock3,
  Download,
  Gauge,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";

import type { ModelRecommendation } from "@/lib/ai/model-recommendation-report";
import {
  CostByActionChart,
  CostByModelChart,
  ModelQualityValueChart,
  QualityTrendChart,
} from "@/components/workbench/work-ai-observability-charts";
import {
  ChapterGenerationTable,
  CostBreakdown,
  ModelQualityTable,
  QualityTrendTable,
} from "@/components/workbench/work-ai-observability-tables";
import {
  exportGenerationCostCsv,
  exportModelQualityCsv,
  exportQualityTrendCsv,
} from "@/lib/workbench/ai-observability-export";
import type { WorkAiObservabilityData } from "@/lib/workbench/ai-observability-types";
import { useAiObservability } from "@/lib/workbench/use-ai-observability";
import { cn } from "@/lib/utils";

type WorkAiObservabilityViewProps = {
  workId: string;
};

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number") return "—";
  return `${value.toLocaleString("zh-CN")}${suffix}`;
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? `${value}` : "—";
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function modelLabel(providerId?: string | null, modelUsed?: string | null) {
  if (!providerId && !modelUsed) return "—";
  return [providerId, modelUsed].filter(Boolean).join(" / ");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportFilename(workId: string, scope: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `ai-observability-${workId}-${scope}-${date}.csv`;
}

export function WorkAiObservabilityView({ workId }: WorkAiObservabilityViewProps) {
  const {
    data,
    error,
    filters,
    loading,
    applyFilters,
    refresh,
    resetFilters,
    setFilters,
  } = useAiObservability(workId);

  return (
    <main className="app-work-surface min-h-dvh px-3 py-4 text-[var(--theme-text-primary)] sm:px-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
        <header className="rounded-[1.6rem] border border-[var(--theme-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(242,250,247,0.9))] p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/dashboard/novel/${encodeURIComponent(workId)}`}
                className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:text-[var(--theme-text-strong)]"
              >
                <ArrowLeft className="h-4 w-4" />
                返回作品
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-[0_18px_32px_-22px_rgba(14,165,233,0.6)] ring-1 ring-[var(--theme-brand-border)]">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--theme-brand-text)]">
                    AI Observability
                  </p>
                  <h1 className="text-2xl font-black tracking-tight text-[var(--theme-text-strong)] sm:text-3xl">
                    作品 AI 观测台
                  </h1>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
                汇总章节质量、模型表现、生成成本与修复链路。它不改正文，只帮你看清 AI 写作引擎哪里稳、哪里贵、哪里需要调参。
              </p>
            </div>

            <div className="grid gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-inner sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-5">
              <FilterInput
                label="From"
                type="datetime-local"
                value={filters.from}
                onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
              />
              <FilterInput
                label="To"
                type="datetime-local"
                value={filters.to}
                onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
              />
              <FilterInput
                label="趋势"
                type="number"
                value={String(filters.trendLimit)}
                min={1}
                max={100}
                onChange={(value) => setFilters((current) => ({ ...current, trendLimit: Number(value) }))}
              />
              <FilterInput
                label="样本"
                type="number"
                value={String(filters.modelMinJobs)}
                min={1}
                max={100}
                onChange={(value) => setFilters((current) => ({ ...current, modelMinJobs: Number(value) }))}
              />
              <FilterInput
                label="章节"
                type="number"
                value={String(filters.chapterLimit)}
                min={1}
                max={300}
                onChange={(value) => setFilters((current) => ({ ...current, chapterLimit: Number(value) }))}
              />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
                <button type="button" className="theme-button-primary h-10 flex-1 rounded-xl text-xs font-black" onClick={applyFilters}>
                  应用筛选
                </button>
                <button type="button" className="theme-button-secondary h-10 rounded-xl px-4 text-xs font-black" onClick={resetFilters}>
                  重置
                </button>
                <button type="button" className="theme-icon-button h-10 w-10 rounded-xl" onClick={refresh} aria-label="刷新 AI 观测数据">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-danger-text)]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <section className="rounded-[1.6rem] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-8 text-center shadow-sm">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--theme-brand-text)]" />
            <p className="text-sm font-bold text-[var(--theme-text-secondary)]">正在加载 AI 观测数据...</p>
          </section>
        ) : data ? (
          <div className="space-y-4">
            <ExportToolbar data={data} workId={workId} />
            <SummaryCards summary={data.summary} />
            <LatestChapterReportPanel report={data.latestChapterReport} />
            <ModelRecommendationPanel recommendations={data.modelRecommendation} />
            <QualityTrendChart qualityTrend={data.qualityTrend} />
            <QualityTrendTable rows={data.qualityTrend} />
            <ModelQualityValueChart
              modelQuality={data.modelQuality}
              byModel={data.generationCost.byModel}
            />
            <ModelQualityTable rows={data.modelQuality} />
            <ChapterGenerationTable rows={data.chapterGeneration} />
            <section className="grid gap-4 xl:grid-cols-2">
              <CostByActionChart byAction={data.generationCost.byAction} />
              <CostByModelChart byModel={data.generationCost.byModel} />
            </section>
            <CostBreakdown
              byAction={data.generationCost.byAction}
              byModel={data.generationCost.byModel}
              totalTokens={data.generationCost.totalTokens}
              auxiliaryTotalTokens={data.auxiliaryCost.totalTokens}
            />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function FilterInput({
  label,
  onChange,
  type,
  value,
  max,
  min,
}: {
  label: string;
  onChange: (value: string) => void;
  type: "datetime-local" | "number";
  value: string;
  max?: number;
  min?: number;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input h-10 rounded-xl px-3 text-xs font-bold"
      />
    </label>
  );
}

function SummaryCards({ summary }: { summary: WorkAiObservabilityViewData["summary"] }) {
  const auxiliaryShare =
    summary.totalGenerationTokens > 0
      ? summary.totalAuxiliaryTokens / summary.totalGenerationTokens
      : null;
  const cards = [
    { label: "最新章节", value: formatNumber(summary.latestChapterIndex), icon: Sparkles },
    { label: "平均质量分", value: formatScore(summary.avgQualityScore), icon: Gauge },
    { label: "平均一致性", value: formatScore(summary.avgConsistencyScore), icon: Gauge },
    { label: "总生成 token", value: formatNumber(summary.totalGenerationTokens), icon: BarChart3 },
    { label: "辅助 AI token", value: formatNumber(summary.totalAuxiliaryTokens), icon: BarChart3 },
    { label: "辅助占比", value: formatPercent(auxiliaryShare), icon: BarChart3 },
    { label: "修复章节数", value: formatNumber(summary.repairedChapterCount), icon: Wrench },
    { label: "长度修复数", value: formatNumber(summary.lengthRepairedChapterCount), icon: Wrench },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{card.label}</span>
              <Icon className="h-4 w-4 text-[var(--theme-brand-text)]" />
            </div>
            <div className="text-2xl font-black tabular-nums text-[var(--theme-text-strong)]">{card.value}</div>
          </div>
        );
      })}
    </section>
  );
}

type WorkAiObservabilityViewData = WorkAiObservabilityData;

function ExportToolbar({
  data,
  workId,
}: {
  data: WorkAiObservabilityViewData;
  workId: string;
}) {
  const buttons = [
    {
      disabled: !data.qualityTrend.length,
      label: "导出质量趋势",
      onClick: () => downloadCsv(
        buildExportFilename(workId, "quality-trend"),
        exportQualityTrendCsv(data.qualityTrend),
      ),
    },
    {
      disabled: !data.modelQuality.length,
      label: "导出模型质量",
      onClick: () => downloadCsv(
        buildExportFilename(workId, "model-quality"),
        exportModelQualityCsv(data.modelQuality),
      ),
    },
    {
      disabled: !data.generationCost.byAction.length && !data.generationCost.byModel.length,
      label: "导出成本",
      onClick: () => downloadCsv(
        buildExportFilename(workId, "generation-cost"),
        exportGenerationCostCsv(data.generationCost),
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-3 rounded-[1.4rem] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-black text-[var(--theme-text-strong)]">数据导出</h2>
        <p className="text-xs font-semibold text-[var(--theme-text-muted)]">
          前端生成 CSV，包含当前筛选结果。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.onClick}
            disabled={button.disabled}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-black text-[var(--theme-text-secondary)] shadow-sm transition hover:border-[var(--theme-brand-border)] hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-text)] disabled:cursor-not-allowed disabled:bg-[var(--theme-surface-muted)] disabled:text-[var(--theme-text-muted)] disabled:shadow-none"
            title={button.disabled ? "暂无可导出的数据" : button.label}
          >
            <Download className="h-3.5 w-3.5" />
            {button.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function LatestChapterReportPanel({
  report,
}: {
  report: WorkAiObservabilityViewData["latestChapterReport"];
}) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--theme-brand-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.72))] p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-brand-text)]">
            Latest Chapter Report
          </p>
          <h2 className="mt-1 text-base font-black text-[var(--theme-text-strong)]">
            最新章节质量
          </h2>
          <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
            最近章节的一致性、质量评分和模型使用情况。
          </p>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-[var(--theme-brand-soft)] px-3 text-xs font-black text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
          {report ? `第 ${report.chapterIndex} 章` : "暂无章节"}
        </span>
      </div>

      {report ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <MetricCard label="一致性分" value={formatScore(report.consistencyScore)} />
            <MetricCard label="质量分" value={formatScore(report.qualityScore)} />
            <MetricCard
              label="一致性模型"
              value={modelLabel(report.consistencyProviderId, report.consistencyModelUsed)}
              small
            />
            <MetricCard
              label="质量模型"
              value={modelLabel(report.qualityProviderId, report.qualityModelUsed)}
              small
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <TextList title="一致性问题" items={report.consistencyIssues} />
            <TextList title="质量问题" items={report.qualityIssues} />
            <TextList title="质量建议" items={report.qualitySuggestions} />
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-solid)]/65 p-5 text-sm font-bold text-[var(--theme-text-muted)]">
          还没有可展示的最新章节质量报告。
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, small, value }: { label: string; small?: boolean; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-[var(--theme-surface-soft)] p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)] ring-1 ring-[var(--theme-border)]/70">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-black text-[var(--theme-text-strong)]",
          small ? "truncate text-xs" : "text-2xl tabular-nums",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function TextList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
      <h3 className="text-xs font-black text-[var(--theme-text-strong)]">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 4).map((item) => (
            <li
              key={item}
              className="rounded-xl bg-[var(--theme-surface-muted)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs font-semibold text-[var(--theme-text-muted)]">暂无记录。</p>
      )}
    </div>
  );
}

function ModelRecommendationPanel({ recommendations }: { recommendations: WorkAiObservabilityViewData["modelRecommendation"] }) {
  return (
    <section className="grid gap-3 lg:grid-cols-4">
      <RecommendationCard title="质量优先" item={recommendations.bestQuality} tone="emerald" />
      <RecommendationCard title="性价比" item={recommendations.bestValue} tone="amber" />
      <RecommendationCard title="速度优先" item={recommendations.fastest} tone="sky" />
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
        <h2 className="text-sm font-black text-[var(--theme-text-strong)]">不推荐模型</h2>
        <div className="mt-3 space-y-2">
          {recommendations.notRecommended.length ? recommendations.notRecommended.slice(0, 4).map((item) => (
            <div key={`${item.providerId}-${item.modelUsed}-${item.reason}`} className="rounded-xl bg-red-50 bg-[var(--theme-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--theme-danger-text)]">
              {modelLabel(item.providerId, item.modelUsed)}：{item.reason}
            </div>
          )) : (
            <p className="text-xs font-semibold text-[var(--theme-text-muted)]">暂无明显不推荐项。</p>
          )}
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({ item, title, tone }: { item: ModelRecommendation | null; title: string; tone: "emerald" | "amber" | "sky" }) {
  const toneClass = {
    emerald: "bg-emerald-50 from-[var(--theme-brand-soft)] to-[var(--theme-surface-solid)] text-[var(--theme-brand-text)]",
    amber: "bg-amber-50 from-[var(--theme-warning-soft)] to-[var(--theme-surface-solid)] text-[var(--theme-warning-text)]",
    sky: "from-[var(--theme-info-soft)] to-[var(--theme-surface-solid)] text-[var(--theme-info-text)]",
  }[tone];

  return (
    <div className={cn("rounded-2xl border border-[var(--theme-border)] bg-gradient-to-br p-4 shadow-sm", toneClass)}>
      <h2 className="text-sm font-black">{title}</h2>
      <p className="mt-3 text-lg font-black text-[var(--theme-text-strong)]">{item ? modelLabel(item.providerId, item.modelUsed) : "样本不足"}</p>
      <p className="mt-2 text-xs font-bold leading-5 opacity-80">{item?.reason ?? "等待更多评分样本后再推荐。"}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[1.6rem] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-8 text-center">
      <Clock3 className="mx-auto mb-3 h-6 w-6 text-[var(--theme-text-muted)]" />
      <p className="text-sm font-bold text-[var(--theme-text-secondary)]">还没有 AI 观测数据，生成章节后这里会自动亮起来。</p>
    </section>
  );
}

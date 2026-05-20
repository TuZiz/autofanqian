"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock3,
  Gauge,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";

import type { ModelRecommendation } from "@/lib/ai/model-recommendation-report";
import {
  ChapterGenerationTable,
  CostBreakdown,
  ModelQualityTable,
  QualityTrendTable,
} from "@/components/workbench/work-ai-observability-tables";
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

function modelLabel(providerId?: string | null, modelUsed?: string | null) {
  if (!providerId && !modelUsed) return "—";
  return [providerId, modelUsed].filter(Boolean).join(" / ");
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
        <header className="rounded-[1.6rem] border border-[var(--theme-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(242,250,247,0.9))] p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] dark:bg-[linear-gradient(135deg,rgba(24,28,26,0.96),rgba(15,18,17,0.92))] sm:p-5">
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
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_18px_32px_-22px_rgba(16,185,129,0.9)]">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
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
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <section className="rounded-[1.6rem] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-8 text-center shadow-sm">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-[var(--theme-text-secondary)]">正在加载 AI 观测数据...</p>
          </section>
        ) : data ? (
          <div className="space-y-4">
            <SummaryCards summary={data.summary} />
            <ModelRecommendationPanel recommendations={data.modelRecommendation} />
            <QualityTrendTable rows={data.qualityTrend} />
            <ModelQualityTable rows={data.modelQuality} />
            <ChapterGenerationTable rows={data.chapterGeneration} />
            <CostBreakdown
              byAction={data.generationCost.byAction}
              byModel={data.generationCost.byModel}
              totalTokens={data.generationCost.totalTokens}
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
  const cards = [
    { label: "最新章节", value: formatNumber(summary.latestChapterIndex), icon: Sparkles },
    { label: "平均质量分", value: formatScore(summary.avgQualityScore), icon: Gauge },
    { label: "平均一致性", value: formatScore(summary.avgConsistencyScore), icon: Gauge },
    { label: "总生成 token", value: formatNumber(summary.totalGenerationTokens), icon: BarChart3 },
    { label: "辅助 AI token", value: formatNumber(summary.totalAuxiliaryTokens), icon: BarChart3 },
    { label: "修复章节数", value: formatNumber(summary.repairedChapterCount), icon: Wrench },
    { label: "长度修复数", value: formatNumber(summary.lengthRepairedChapterCount), icon: Wrench },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{card.label}</span>
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black tabular-nums text-[var(--theme-text-strong)]">{card.value}</div>
          </div>
        );
      })}
    </section>
  );
}

type WorkAiObservabilityViewData = WorkAiObservabilityData;

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
            <div key={`${item.providerId}-${item.modelUsed}-${item.reason}`} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">
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
    emerald: "from-emerald-50 to-white text-emerald-700 dark:from-emerald-500/10 dark:to-transparent dark:text-emerald-200",
    amber: "from-amber-50 to-white text-amber-700 dark:from-amber-500/10 dark:to-transparent dark:text-amber-200",
    sky: "from-sky-50 to-white text-sky-700 dark:from-sky-500/10 dark:to-transparent dark:text-sky-200",
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

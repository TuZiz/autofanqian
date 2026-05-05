"use client";

import { Compass, Layers3, Menu, PenLine, Zap } from "lucide-react";

import {
  formatChapterCount,
  formatChapterLabel,
} from "@/lib/workbench/work-dashboard-format";
import { DEFAULT_PLANNING_CONFIG, type PlanningPreset } from "@/lib/create/progressive-planning";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

import { ChapterGenerationTopbarProgress } from "./chapter-generation-progress";

export function WorkDashboardSidebar({
  className,
  dashboard,
}: {
  className?: string;
  dashboard: WorkDashboardController;
}) {
  const {
    activeGeneration,
    currentProgressChapter,
    goToChapter,
    maxChapterIndex,
    nextChapterIndex,
    openOutlineRefineConfirm,
    outlineExtensionSize,
    outlineExtensionState,
    outlineRefineBusy,
    outlineRefineError,
    plannedChapterCount,
    progressPercent,
    remainingBuffer,
    setCommandOpen,
    setOutlineExtensionSize,
    targetChapterCount,
    work,
  } = dashboard;

  const targetChapter = plannedChapterCount || maxChapterIndex || nextChapterIndex;
  const currentChapterLabel =
    currentProgressChapter > 0 ? formatChapterLabel(currentProgressChapter) : "尚未开始";
  const extensionPresets: PlanningPreset[] = ["short", "smart", "long"];

  return (
    <aside
      className={cn(
        "w-full min-w-0 min-[1520px]:sticky min-[1520px]:top-24 min-[1520px]:max-h-[calc(100vh-6rem)] min-[1520px]:overflow-y-auto min-[1520px]:overscroll-contain min-[1520px]:pb-6 min-[1520px]:pr-1 min-[1520px]:[scrollbar-gutter:stable]",
        className,
      )}
    >
      <section className="overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/60 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60">
        <div className="border-b border-zinc-200/50 bg-white/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/50">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                创作控制台
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-zinc-950 dark:text-white">
                写作进度
              </h3>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black tabular-nums text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              {progressPercent || 0}%
            </span>
          </div>

          <div className="space-y-3">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500 dark:bg-blue-400"
                style={{ width: `${progressPercent || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-500 dark:text-zinc-400">
                当前: <span className="text-zinc-950 dark:text-zinc-200">{currentChapterLabel}</span>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                目标: <span className="text-zinc-950 dark:text-zinc-200">{formatChapterLabel(targetChapter)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => goToChapter(nextChapterIndex)}
              className="group flex w-full items-center justify-between rounded-xl bg-zinc-950 p-3 text-left transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:hover:bg-zinc-200"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-white dark:text-zinc-950">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 dark:bg-zinc-900/10">
                  <PenLine className="h-4 w-4" />
                </span>
                继续写作
              </span>
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                {formatChapterLabel(nextChapterIndex)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-zinc-200/80 bg-white p-3 text-left shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-1 hover:ring-zinc-300 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:hover:ring-zinc-700"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-zinc-950 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Menu className="h-4 w-4" />
                </span>
                打开目录面板
              </span>
            </button>

            <button
              type="button"
              disabled={!work || outlineRefineBusy || !outlineExtensionState.allowed}
              onClick={openOutlineRefineConfirm}
              className="group flex w-full items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-left shadow-sm transition-all hover:bg-amber-100 hover:shadow-md hover:ring-1 hover:ring-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20 dark:hover:ring-amber-500/40"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-amber-800 dark:text-amber-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/50 dark:bg-amber-500/20">
                  <Zap className={cn("h-4 w-4", outlineRefineBusy && "animate-pulse")} />
                </span>
                规划下一段
              </span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {extensionPresets.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setOutlineExtensionSize(size)}
                className={cn(
                  "h-10 rounded-xl border px-2 text-xs font-bold transition-all active:scale-[0.98]",
                  outlineExtensionSize === size
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-zinc-200/80 bg-white/80 text-zinc-600 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 hover:shadow dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white",
                )}
              >
                {DEFAULT_PLANNING_CONFIG.presets[size].label.replace(" ", "\n")}
              </button>
            ))}
          </div>

          {!outlineExtensionState.allowed && !outlineRefineError ? (
            <div className="mt-4 rounded-xl border border-zinc-200/50 bg-zinc-50/80 p-3.5 text-xs font-bold leading-relaxed text-zinc-500 shadow-inner dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
              {outlineExtensionState.reason}
            </div>
          ) : null}

          {outlineRefineError ? (
            <div className="mt-4 rounded-xl border border-red-200/60 bg-red-50/80 p-3.5 text-xs font-bold leading-relaxed text-red-600 shadow-inner dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              {outlineRefineError}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)] min-[1160px]:grid-cols-1">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-zinc-950 dark:text-white">写作节奏</h3>
              </div>
              <span className="text-xs font-black tabular-nums text-zinc-500 dark:text-zinc-400">
                {progressPercent}%
              </span>
            </div>

            {activeGeneration ? (
              <div className="mb-5">
                <ChapterGenerationTopbarProgress generation={activeGeneration} />
              </div>
            ) : null}

            <div className="space-y-2.5">
              <MetricRow label="大纲规划至" value={formatChapterLabel(targetChapter)} />
              <MetricRow label="长期目标" value={targetChapterCount ? formatChapterLabel(targetChapterCount) : "未设定"} />
              <MetricRow label="当前撰写至" value={currentChapterLabel} accent />
              <MetricRow
                label="剩余缓冲量"
                value={remainingBuffer ? formatChapterCount(remainingBuffer) : "需要补充"}
                danger={!remainingBuffer || remainingBuffer < 5}
              />
            </div>
          </div>

          <div className="border-t border-zinc-200/60 pt-5 dark:border-zinc-800/60 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 min-[1160px]:border-l-0 min-[1160px]:border-t min-[1160px]:pl-0 min-[1160px]:pt-5">
            <div>
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                <span>章节推进</span>
                <span className="tabular-nums">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 dark:bg-blue-400"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200/50 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="flex items-center gap-2.5 text-sm font-black text-zinc-950 dark:text-white">
                <Layers3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                分卷检查舱
              </div>
              <p className="mt-2.5 text-xs font-semibold leading-relaxed text-zinc-600 dark:text-zinc-300">
                展开左侧分卷检查节奏、冲突和章节跨度；保持章节推进有稳定余量。
              </p>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}

function MetricRow({
  accent,
  danger,
  label,
  value,
}: {
  accent?: boolean;
  danger?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/80">
      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className={cn(
          "shrink-0 text-sm font-black text-zinc-950 dark:text-zinc-100",
          accent && "text-blue-700 dark:text-blue-300",
          danger && "text-red-600 dark:text-red-300",
        )}
      >
        {value}
      </span>
    </div>
  );
}

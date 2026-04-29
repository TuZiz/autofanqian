"use client";

import { Compass, Layers3, Menu, PenLine, Zap } from "lucide-react";

import {
  formatChapterCount,
  formatChapterLabel,
} from "@/lib/workbench/work-dashboard-format";
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
    generationThinking,
    goToChapter,
    maxChapterIndex,
    nextChapterIndex,
    openOutlineRefineConfirm,
    outlineExtensionSize,
    outlineRefineBusy,
    outlineRefineError,
    plannedChapterCount,
    progressPercent,
    remainingBuffer,
    setCommandOpen,
    setOutlineExtensionSize,
    work,
  } = dashboard;

  const targetChapter = plannedChapterCount || maxChapterIndex || nextChapterIndex;
  const currentChapterLabel =
    currentProgressChapter > 0 ? formatChapterLabel(currentProgressChapter) : "尚未开始";

  return (
    <aside
      className={cn(
        "w-full min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-1 lg:[scrollbar-gutter:stable]",
        className,
      )}
    >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-[#fbfcf8] p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                创作控制台
              </p>
              <h3 className="mt-1 truncate text-base font-black text-slate-950 dark:text-white">
                下一步 · {formatChapterLabel(nextChapterIndex)}
              </h3>
            </div>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
              主入口
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              disabled={!work}
              onClick={() => goToChapter(nextChapterIndex)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:col-span-2 lg:col-span-1 xl:col-span-2"
            >
              <PenLine className="h-5 w-5" />
              <span>继续写作：{formatChapterLabel(nextChapterIndex)}</span>
            </button>

            <button
              type="button"
              disabled={!work}
              onClick={() => setCommandOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <Menu className="h-4 w-4" />
              <span>章节</span>
            </button>

            <button
              type="button"
              disabled={!work || outlineRefineBusy}
              onClick={openOutlineRefineConfirm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
            >
              <Zap className={cn("h-4 w-4", outlineRefineBusy && "animate-pulse")} />
              <span>{outlineRefineBusy ? "推演中" : "延伸"}</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[20, 40, 60].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setOutlineExtensionSize(size as 20 | 40 | 60)}
                className={cn(
                  "h-9 rounded-lg border px-2 text-xs font-black transition-colors active:scale-[0.98]",
                  outlineExtensionSize === size
                    ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                )}
              >
                {formatChapterCount(size)}
              </button>
            ))}
          </div>

          {outlineRefineError ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-6 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
              {outlineRefineError}
            </div>
          ) : null}
        </div>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              <h3 className="text-sm font-black text-slate-950 dark:text-white">写作节奏</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {progressPercent}%
            </span>
          </div>

          {activeGeneration ? (
            <div className="mb-4">
              <ChapterGenerationTopbarProgress
                generation={activeGeneration}
                copy={generationThinking.copy}
                copyIndex={generationThinking.index}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <MetricRow label="大纲规划至" value={formatChapterLabel(targetChapter)} />
            <MetricRow label="当前撰写至" value={currentChapterLabel} accent />
            <MetricRow
              label="剩余缓冲量"
              value={remainingBuffer ? formatChapterCount(remainingBuffer) : "需要补强"}
              danger={!remainingBuffer || remainingBuffer < 5}
            />
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>章节推进</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-md bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
              <Layers3 className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              分卷检查舱
            </div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
              展开左侧分卷检查节奏、冲突和章节跨度；保持章节推进有稳定余量。
            </p>
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          "shrink-0 text-sm font-black text-slate-950 dark:text-slate-100",
          accent && "text-emerald-700 dark:text-emerald-300",
          danger && "text-rose-600 dark:text-rose-300",
        )}
      >
        {value}
      </span>
    </div>
  );
}

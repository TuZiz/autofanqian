"use client";

import type { ReactNode } from "react";
import { Compass, Loader2, PenLine, SearchCheck, Zap } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_PLANNING_CONFIG, type PlanningPreset } from "@/lib/create/progressive-planning";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { formatChapterCount, formatChapterLabel } from "@/lib/workbench/work-dashboard-format";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

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
    consistencyBusy,
    consistencyError,
    consistencyNotice,
    handleBookConsistencyCheck,
    maxChapterIndex,
    nextChapterIndex,
    openOutlineRefineConfirm,
    outlineExtensionSize,
    outlineExtensionState,
    outlineRefineBusy,
    outlineRefineError,
    plannedChapterCount,
    remainingBuffer,
    setOutlineExtensionSize,
    targetChapterCount,
    work,
  } = dashboard;

  const targetChapter = plannedChapterCount || maxChapterIndex || nextChapterIndex;
  const isShortStory = isShortStoryWork(work?.workType);
  const formatUnitLabel = (index: number) =>
    isShortStory ? `场景 ${index}` : formatChapterLabel(index);
  const currentChapterLabel = currentProgressChapter > 0 ? formatUnitLabel(currentProgressChapter) : "尚未开始";
  const extensionPresets: PlanningPreset[] = ["short", "smart", "long"];
  const extendBlockedReason = !outlineExtensionState.allowed ? outlineExtensionState.reason : "";

  return (
    <aside
      className={cn(
        "w-full min-w-0 self-start min-[1240px]:sticky min-[1240px]:top-16 min-[1240px]:pr-1",
        className,
      )}
    >
      <section className="app-compact-panel overflow-hidden">
        <div className="grid gap-2.5 px-3.5 py-3">
          <SidebarActionButton
            tone="primary"
            icon={<PenLine className="h-4 w-4" />}
            label="继续写作"
            meta={formatUnitLabel(nextChapterIndex)}
            onClick={() => goToChapter(nextChapterIndex)}
          />

          {isShortStory ? null : extendBlockedReason ? (
            <Tooltip delay={0} closeDelay={0}>
              <TooltipTrigger>
                <button
                  type="button"
                  aria-disabled="true"
                  onClick={(event) => event.preventDefault()}
                  className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[1.1rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,246,219,0.93))] px-3.5 py-3 text-left text-amber-900 opacity-50 shadow-[0_14px_28px_-22px_rgba(180,83,9,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all aria-disabled:cursor-not-allowed dark:border-amber-500/30 dark:bg-[linear-gradient(180deg,rgba(68,45,17,0.96),rgba(47,31,12,0.92))] dark:text-amber-200"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200/80 bg-white/70 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      <Zap className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold tracking-[0.01em]">规划下一段</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[19rem] rounded-[1rem] border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(255,244,217,0.95))] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-amber-950 shadow-[0_20px_32px_-24px_rgba(180,83,9,0.3)] [--tooltip-bg:rgba(255,250,240,0.98)] [--tooltip-border:rgba(253,230,138,0.95)] [--tooltip-fg:rgba(120,53,15,0.96)] [--tooltip-shadow:0_20px_34px_-24px_rgba(180,83,9,0.28)] dark:border-amber-400/30 dark:bg-[linear-gradient(180deg,rgba(69,45,18,0.98),rgba(50,32,13,0.95))] dark:text-amber-100 dark:[--tooltip-bg:rgba(64,42,17,0.98)] dark:[--tooltip-border:rgba(251,191,36,0.28)] dark:[--tooltip-fg:rgba(254,243,199,0.98)] dark:[--tooltip-shadow:0_20px_34px_-24px_rgba(0,0,0,0.55)]">
                {extendBlockedReason}
              </TooltipContent>
            </Tooltip>
          ) : (
            <SidebarActionButton
              tone="warm"
              icon={<Zap className={cn("h-4 w-4", outlineRefineBusy && "animate-pulse")} />}
              label={outlineRefineBusy ? "规划中..." : "规划下一段"}
              onClick={openOutlineRefineConfirm}
              disabled={!work || outlineRefineBusy}
            />
          )}

          {isShortStory ? null : (
          <div className="grid grid-cols-3 gap-2">
            {extensionPresets.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setOutlineExtensionSize(size)}
                className={cn(
                  "min-h-11 whitespace-pre-line rounded-xl border px-2 text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.98]",
                  outlineExtensionSize === size
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-[var(--theme-border)] bg-white/80 text-zinc-500 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 hover:shadow dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white",
                )}
              >
                {DEFAULT_PLANNING_CONFIG.presets[size].label.replace(" ", "\n")}
              </button>
            ))}
          </div>
          )}

          {outlineRefineError ? (
            <div className="rounded-xl border border-red-200/60 bg-red-50/80 p-3 text-xs font-bold leading-5 text-red-600 shadow-inner dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              {outlineRefineError}
            </div>
          ) : null}

          <SidebarActionButton
            tone="neutral"
            icon={consistencyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
            label={consistencyBusy ? "检查中..." : "检查剧情一致性"}
            meta="全书"
            onClick={() => void handleBookConsistencyCheck()}
            disabled={!work || consistencyBusy}
          />

          {consistencyError || consistencyNotice ? (
            <div
              className={cn(
                "rounded-xl border p-3 text-xs font-bold leading-5 shadow-inner",
                consistencyError
                  ? "border-red-200/60 bg-red-50/80 text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300"
                  : "border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
              )}
            >
              {consistencyError || consistencyNotice}
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--theme-border)] px-3.5 py-3">
          <div>
            <div className="mb-2.5 flex items-center gap-2 text-sm font-bold tracking-wide text-[var(--theme-text-strong)]">
              <Compass className="h-4 w-4 text-[var(--theme-brand-600)]" />
              写作节奏
            </div>

            {activeGeneration ? (
              <div className="mb-3">
                <ChapterGenerationTopbarProgress generation={activeGeneration} />
              </div>
            ) : null}

            <div className="space-y-2">
              <MetricRow label={isShortStory ? "短篇拆分" : "大纲规划至"} value={formatUnitLabel(targetChapter)} />
              <MetricRow label={isShortStory ? "场景总数" : "长期目标"} value={targetChapterCount ? formatUnitLabel(targetChapterCount) : "未设定"} />
              <MetricRow label="当前撰写至" value={currentChapterLabel} accent />
              <MetricRow
                label={isShortStory ? "剩余场景" : "剩余缓冲量"}
                value={
                  remainingBuffer
                    ? isShortStory
                      ? `${remainingBuffer} 段`
                      : formatChapterCount(remainingBuffer)
                    : isShortStory
                      ? "已到末段"
                      : "需要补充"
                }
                danger={!isShortStory && (!remainingBuffer || remainingBuffer < 5)}
              />
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}

function SidebarActionButton({
  disabled,
  icon,
  label,
  meta,
  onClick,
  tone,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
  tone: "neutral" | "primary" | "warm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[1.1rem] border px-3.5 py-3 text-left transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" &&
          "border-zinc-900 bg-[linear-gradient(180deg,#171717,#050505)] text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-24px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,#ffffff,#e9edf1)] dark:text-zinc-950",
        tone === "neutral" &&
          "border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,246,249,0.93))] text-[var(--theme-text-strong)] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.38),inset_0_1px_0_rgba(255,255,255,0.96)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-22px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.98)] dark:border-[var(--theme-border)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(18,18,20,0.92))]",
        tone === "warm" &&
          "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,246,219,0.93))] text-amber-900 shadow-[0_14px_28px_-22px_rgba(180,83,9,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-20px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.98)] dark:border-amber-500/30 dark:bg-[linear-gradient(180deg,rgba(68,45,17,0.96),rgba(47,31,12,0.92))] dark:text-amber-200",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
            tone === "primary" && "border-white/10 bg-white/10 text-white dark:border-zinc-900/10 dark:bg-zinc-900/10 dark:text-zinc-950",
            tone === "neutral" && "border-zinc-200/80 bg-white/90 text-zinc-700 dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-300",
            tone === "warm" && "border-amber-200/80 bg-white/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
          )}
        >
          {icon}
        </span>
        <span className="text-sm font-bold tracking-[0.01em]">{label}</span>
      </span>
      {meta ? (
        <span
          className={cn(
            "text-[11px] font-black uppercase tracking-[0.18em]",
            tone === "primary" ? "text-white/72 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2.5 shadow-sm transition-all hover:bg-[var(--theme-surface-hover)]">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">{label}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums text-sm font-bold text-[var(--theme-text-strong)]",
          accent && "text-[var(--theme-brand-text)]",
          danger && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

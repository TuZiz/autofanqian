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
                  className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[1.1rem] border border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-3.5 py-3 text-left text-[var(--theme-warning-text)] opacity-50 shadow-[var(--theme-shadow-button)] transition-all aria-disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--theme-warning-border)]/80 bg-[var(--theme-surface-soft)] text-[var(--theme-warning-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                      <Zap className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold tracking-[0.01em]">规划下一段</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[19rem] rounded-[1rem] border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-[var(--theme-warning-text)] shadow-[var(--theme-shadow-button)] [--tooltip-bg:var(--theme-warning-soft)] [--tooltip-border:var(--theme-warning-border)] [--tooltip-fg:var(--theme-warning-text)] [--tooltip-shadow:var(--theme-shadow-button)]">
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
                    ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-md"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-muted)] shadow-sm hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow",
                )}
              >
                {DEFAULT_PLANNING_CONFIG.presets[size].label.replace(" ", "\n")}
              </button>
            ))}
          </div>
          )}

          {outlineRefineError ? (
            <div className="rounded-xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] p-3 text-xs font-bold leading-5 text-[var(--theme-danger-text)] shadow-inner">
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
                  ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]"
                  : "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
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
          "theme-brand-gradient-bg border-transparent text-white shadow-[var(--theme-shadow-button)] hover:-translate-y-0.5 hover:shadow-[var(--theme-shadow-card)]",
        tone === "neutral" &&
          "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-strong)] shadow-[var(--theme-shadow-button)] hover:-translate-y-0.5 hover:shadow-[var(--theme-shadow-card)]",
        tone === "warm" &&
          "border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] shadow-[var(--theme-shadow-button)] hover:-translate-y-0.5 hover:shadow-[var(--theme-shadow-card)]",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
            tone === "primary" && "border-white/10 bg-white/10 text-white",
            tone === "neutral" && "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-secondary)]",
            tone === "warm" && "border-[var(--theme-warning-border)]/80 bg-[var(--theme-surface-soft)] text-[var(--theme-warning-text)]",
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
            tone === "primary" ? "text-white/72" : "text-[var(--theme-text-muted)]",
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
          danger && "text-[var(--theme-warning-text)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

"use client";

import { BookOpen, ChevronRight, RefreshCw, Sparkles } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

export function CreateSectionNav({
  create,
  onJumpToIdea,
}: {
  create: DashboardCreateController;
  onJumpToIdea: () => void;
}) {
  const customReadyCount = [
    create.customGenreLabel.trim().length >= 2,
    create.customTags.length >= 2,
    create.customWorldDetails.trim().length >= 18,
  ].filter(Boolean).length;

  return (
    <aside className="min-[1040px]:sticky min-[1040px]:top-[4.5rem]">
      <div className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
        <div className="border-b border-[var(--theme-border)] px-3 py-3">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={create.templateShowcaseBusy}
              onClick={create.refreshTemplateShowcase}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 text-[11px] font-semibold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", create.templateShowcaseBusy && "animate-spin text-emerald-500")} />
              {create.templateShowcaseBusy ? "刷新中" : "刷新模板"}
            </button>
          </div>

          <button
            type="button"
            onClick={onJumpToIdea}
            className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-1.5 text-left text-xs font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
          >
            <span>直接跳到创意输入</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="p-2.5">
          <div className="mb-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/80 p-2 dark:border-emerald-500/20 dark:bg-emerald-500/8">
            <button
              type="button"
              onClick={create.handleUseCustomStart}
              aria-pressed={create.isCustomGenre}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                create.isCustomGenre
                  ? "bg-white/80 text-[var(--theme-text-strong)] shadow-sm dark:bg-black/10"
                  : "text-[var(--theme-text-secondary)] hover:bg-white/60 dark:hover:bg-white/5",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  create.isCustomGenre
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/14 dark:text-emerald-300"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)]",
                )}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">自定义创作</span>
                  <span className="rounded-full bg-[var(--theme-surface-overlay)] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-text-secondary)]">
                    {customReadyCount}/3
                  </span>
                </span>
              </span>
            </button>
          </div>

          <div className="space-y-1.5">
            {create.templateShowcaseCards.map((card) => {
              const isActive = create.selectedTemplateCardId === card.id && !create.isCustomGenre;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => void create.handleTemplateShowcaseSelect(card.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all",
                    isActive
                      ? "border-amber-200 bg-amber-50/80 text-[var(--theme-text-strong)] shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      isActive
                        ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)]",
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">{card.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-opacity",
                          isActive ? "opacity-100 text-amber-600 dark:text-amber-300" : "opacity-0 group-hover:opacity-100",
                        )}
                      />
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--theme-text-muted)]">
                      {card.genreLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}

"use client";

import { BookOpen, ChevronRight, PenLine, RefreshCw } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

export function CreateSectionNav({
  create,
}: {
  create: DashboardCreateController;
}) {
  const customReadyCount = [
    create.customGenreLabel.trim().length >= 2,
    create.customTags.length >= 2,
    create.customWorldDetails.trim().length >= 18,
  ].filter(Boolean).length;

  return (
    <aside className="min-[1040px]:sticky min-[1040px]:top-[4.5rem]">
      <div className="rounded-2xl bg-[var(--theme-surface-solid)] p-3">
        {/* 刷新按钮 */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
            选择模板
          </span>
          <button
            type="button"
            disabled={create.templateShowcaseBusy}
            onClick={create.refreshTemplateShowcase}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-secondary)] disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3",
                create.templateShowcaseBusy && "animate-spin",
              )}
            />
            {create.templateShowcaseBusy ? "刷新中" : "刷新"}
          </button>
        </div>

        {/* 自定义创作 */}
        <button
          type="button"
          onClick={create.handleUseCustomStart}
          aria-pressed={create.isCustomGenre}
          className={cn(
            "group mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all",
            create.isCustomGenre
              ? "bg-[var(--theme-text-strong)] text-[var(--theme-bg)]"
              : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              create.isCustomGenre
                ? "bg-white/20"
                : "bg-[var(--theme-surface-overlay)]",
            )}
          >
            <PenLine className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold">自定义创作</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  create.isCustomGenre
                    ? "bg-white/20 text-white/80"
                    : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)]",
                )}
              >
                {customReadyCount}/3
              </span>
            </span>
          </span>
        </button>

        {/* 模板列表 */}
        <nav className="space-y-1">
          {create.templateShowcaseCards.map((card) => {
            const isActive =
              create.selectedTemplateCardId === card.id &&
              !create.isCustomGenre;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  void create.handleTemplateShowcaseSelect(card.id)
                }
                aria-pressed={isActive}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-strong)]"
                    : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-[var(--theme-text-strong)] text-[var(--theme-bg)]"
                      : "bg-[var(--theme-surface-overlay)]",
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {card.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-opacity",
                        isActive
                          ? "opacity-60"
                          : "opacity-0 group-hover:opacity-40",
                      )}
                    />
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--theme-text-muted)]">
                    {card.genreLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

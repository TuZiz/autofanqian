"use client";

import { BookOpen, ChevronRight, PenLine, RefreshCw } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

export function CreateSectionNav({ create }: { create: DashboardCreateController }) {
  const customReadyCount = [
    create.customGenreLabel.trim().length >= 2,
    create.customTags.length >= 2,
    create.customWorldDetails.trim().length >= 18,
  ].filter(Boolean).length;

  return (
    <aside className="min-w-0 min-[1080px]:sticky min-[1080px]:top-3">
      <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-card)] backdrop-blur-xl">
        <div className="shrink-0 border-b border-[var(--theme-divider)] px-2.5 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black tracking-tight text-[var(--theme-text-strong)]">
                热门模板
              </h2>
              <p className="text-[11px] font-semibold text-[var(--theme-text-muted)]">
                点击快速填充创意
              </p>
            </div>
            <button
              type="button"
              disabled={create.templateShowcaseBusy}
              onClick={create.refreshTemplateShowcase}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] px-2 text-xs font-black text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", create.templateShowcaseBusy && "animate-spin")} />
              刷新
            </button>
          </div>

          <button
            type="button"
            onClick={create.handleUseCustomStart}
            aria-pressed={create.isCustomGenre}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-[8px] border px-2.5 py-2 text-left transition",
              create.isCustomGenre
                ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-surface-overlay)] ring-1 ring-[var(--theme-border)]">
              <PenLine className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black">自定义创作</span>
              <span className="mt-0.5 block text-xs font-semibold opacity-75">
                题材、标签、设定 {customReadyCount}/3
              </span>
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {create.templateShowcaseCards.map((card) => {
            const isActive = create.selectedTemplateCardId === card.id && !create.isCustomGenre;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => void create.handleTemplateShowcaseSelect(card.id)}
                aria-pressed={isActive}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-[8px] border px-2.5 py-2 text-left transition",
                  isActive
                    ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]",
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-surface-overlay)] ring-1 ring-[var(--theme-border)]">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black">{card.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-45 transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--theme-text-muted)]">
                    {card.genreLabel}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
                    {card.summary}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

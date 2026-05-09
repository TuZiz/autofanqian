"use client";

import { Button, Card, Chip, ScrollShadow } from "@heroui/react";
import { BookOpen, LayoutGrid, RefreshCw, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

// 重点：使用 export function 命名导出，不要用 export default
export function CreateSectionNav({
  create,
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
    <aside className="min-[1040px]:sticky min-[1040px]:top-24">
      <Card
        variant="default"
        className="app-compact-panel flex flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)]/60 bg-[var(--theme-bg)]/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
      >
        <Card.Header className="border-b border-[var(--theme-border)]/40 bg-gradient-to-b from-[var(--theme-surface-overlay)]/30 to-transparent px-4 py-3.5">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:text-emerald-300 dark:ring-emerald-500/20">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <Card.Title className="truncate text-base font-black tracking-tight text-[var(--theme-text-strong)]">
                工作流
              </Card.Title>
            </div>

            <Button
              size="sm"
              variant="outline"
              isDisabled={create.templateShowcaseBusy}
              onPress={create.refreshTemplateShowcase}
              className="group h-8 min-w-0 rounded-lg border-[var(--theme-border)]/60 bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-primary)] shadow-sm hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)]"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 text-[var(--theme-text-muted)] transition-colors group-hover:text-[var(--theme-text-primary)]",
                  create.templateShowcaseBusy && "animate-spin text-emerald-500"
                )}
              />
              {create.templateShowcaseBusy ? "刷新中" : "换一批"}
            </Button>
          </div>
        </Card.Header>

        <Card.Content className="p-3">
          <ScrollShadow
            hideScrollBar
            className="max-h-[calc(100dvh-190px)] min-[1040px]:max-h-[calc(100dvh-150px)]"
          >
            <nav className="flex flex-col gap-1.5 p-1">
              <Button
                fullWidth
                variant="outline"
                onPress={create.handleUseCustomStart}
                aria-pressed={create.isCustomGenre}
                className={cn(
                  "group relative h-auto min-h-[56px] justify-normal overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-300",
                  create.isCustomGenre
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-900 shadow-sm dark:border-emerald-500/35 dark:from-emerald-500/10 dark:to-emerald-500/5 dark:text-emerald-100"
                    : "border-transparent bg-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-overlay)]"
                )}
              >
                {create.isCustomGenre && (
                  <motion.div layoutId="nav-indicator" className="absolute left-0 top-0 w-1 h-full bg-emerald-500 rounded-r-md" />
                )}
                
                <span className="relative z-10 flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        create.isCustomGenre
                          ? "bg-white text-emerald-600 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] group-hover:bg-white dark:group-hover:bg-zinc-800"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="whitespace-nowrap text-[15px] font-black">自定义</span>
                  </span>

                  <Chip
                    size="sm"
                    variant="soft"
                    color={create.isCustomGenre ? "success" : "default"}
                    className={cn(
                      "shrink-0 rounded-md px-2 text-[11px] font-black tabular-nums transition-colors",
                      create.isCustomGenre ? "bg-emerald-200/50 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200" : ""
                    )}
                  >
                    {customReadyCount}/3
                  </Chip>
                </span>
              </Button>

              <div className="mx-3 my-2 h-px bg-[var(--theme-divider)]/40" />

              {create.templateShowcaseCards.map((card) => {
                const isActive = create.selectedTemplateCardId === card.id && !create.isCustomGenre;

                return (
                  <Button
                    key={card.id}
                    fullWidth
                    variant="outline"
                    onPress={() => void create.handleTemplateShowcaseSelect(card.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "group relative h-auto min-h-[56px] justify-normal overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-300",
                      isActive
                        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-900 shadow-sm dark:border-amber-500/35 dark:from-amber-500/10 dark:to-amber-500/5 dark:text-amber-100"
                        : "border-transparent bg-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-overlay)]"
                    )}
                  >
                    {isActive && (
                      <motion.div layoutId="nav-indicator" className="absolute left-0 top-0 w-1 h-full bg-amber-500 rounded-r-md" />
                    )}

                    <span className="relative z-10 flex w-full min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-white text-amber-600 shadow-sm dark:bg-amber-500/20 dark:text-amber-300"
                            : "bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] group-hover:bg-white dark:group-hover:bg-zinc-800"
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[var(--theme-text-strong)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {card.label}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-[11px] font-bold tracking-wide",
                            isActive
                              ? "text-amber-700/80 dark:text-amber-300/80"
                              : "text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-secondary)]"
                          )}
                        >
                          {card.genreLabel}
                        </span>
                      </span>
                      
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-300",
                        isActive ? "text-amber-500 translate-x-0 opacity-100" : "-translate-x-2 opacity-0 text-[var(--theme-text-muted)] group-hover:translate-x-0 group-hover:opacity-100"
                      )} />
                    </span>
                  </Button>
                );
              })}
            </nav>
          </ScrollShadow>
        </Card.Content>
      </Card>
    </aside>
  );
}

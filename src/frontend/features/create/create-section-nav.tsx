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
    <aside className="min-w-0 min-[1040px]:sticky min-[1040px]:top-[64px] min-[1040px]:h-[calc(100dvh-82px)] min-[1040px]:w-[240px] min-[1440px]:w-[248px]">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white/92 shadow-[0_8px_22px_-20px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="shrink-0 border-b border-slate-100 px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold tracking-tight text-slate-950">
                选择模板
              </h2>
            </div>
            <button
              type="button"
              disabled={create.templateShowcaseBusy}
              onClick={create.refreshTemplateShowcase}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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

          <button
            type="button"
            onClick={create.handleUseCustomStart}
            aria-pressed={create.isCustomGenre}
            className={cn(
              "group relative flex h-[52px] w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left transition-all duration-200",
              create.isCustomGenre
                ? "bg-slate-950 text-white"
                : "bg-slate-50/80 text-slate-700 hover:bg-slate-100/80",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-2 h-[calc(100%-16px)] w-[2px] rounded-r-full transition-colors",
                create.isCustomGenre ? "bg-slate-300" : "bg-transparent",
              )}
            />
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                create.isCustomGenre
                  ? "bg-white/14 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200/80",
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold leading-5">
                  自定义创作
                </span>
                {create.isCustomGenre ? (
                  <span className="rounded-full bg-white/14 px-1 py-0.5 text-[10px] font-bold leading-none text-white/80">
                    {customReadyCount}/3
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "block truncate text-[11px] font-medium leading-3",
                  create.isCustomGenre ? "text-white/62" : "text-slate-500",
                )}
              >
                从题材、标签和设定开始
              </span>
              {create.isCustomGenre ? (
                <span className="mt-0.5 block h-0.5 overflow-hidden rounded-full bg-white/14">
                  <span
                    className="block h-full rounded-full bg-white/70 transition-all duration-300"
                    style={{ width: `${(customReadyCount / 3) * 100}%` }}
                  />
                </span>
              ) : null}
            </span>
          </button>
        </div>

        <div className="create-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5">
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
                  "group relative flex h-12 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left transition-all duration-200",
                  isActive
                    ? "bg-slate-950 text-white"
                    : "border border-transparent text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-2 h-[calc(100%-16px)] w-[2px] rounded-r-full transition-colors",
                    isActive ? "bg-slate-300" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                    isActive
                      ? "bg-white/14 text-white"
                      : "bg-slate-50 text-slate-400 ring-1 ring-slate-200/80 group-hover:bg-white group-hover:text-slate-700",
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "block truncate text-sm leading-5",
                        isActive ? "font-bold text-white" : "font-semibold text-slate-700",
                      )}
                    >
                      {card.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 shrink-0 transition-all duration-200",
                        isActive
                          ? "text-white/50"
                          : "text-slate-300 opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "block truncate text-[11px] font-semibold leading-3",
                      isActive ? "text-white/58" : "text-slate-500",
                    )}
                  >
                    {card.genreLabel}
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

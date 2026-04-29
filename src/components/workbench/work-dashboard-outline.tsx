"use client";

import { BookText, ChevronDown, Edit3, Layers, Quote } from "lucide-react";

import {
  formatChapterCount,
  formatVolumeDesc,
} from "@/lib/workbench/work-dashboard-format";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

export function WorkSynopsisCard({ dashboard }: { dashboard: WorkDashboardController }) {
  const { outline, work } = dashboard;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <BookText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">作品简介</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">核心设定与卖点</p>
          </div>
        </div>
        <Quote className="h-5 w-5 text-slate-300 dark:text-slate-700" />
      </div>

      <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-[#fbfcf8] p-4 text-sm font-medium leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        {work?.synopsis || outline?.synopsis || "暂无作品简介。"}
      </p>
    </section>
  );
}

export function WorkVolumesPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    goToChapter,
    openOutlineRefineConfirm,
    openVolumeIndex,
    outline,
    outlineRefineBusy,
    plannedChapterCount,
    setOpenVolumeIndex,
    work,
  } = dashboard;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">分卷结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{outline ? `${outline.volumes.length}卷` : "0卷"}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{formatChapterCount(plannedChapterCount || 0)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!work || outlineRefineBusy}
          onClick={openOutlineRefineConfirm}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
        >
          <Edit3 className="h-4 w-4" />
          <span>{outlineRefineBusy ? "推演中..." : "重写大纲"}</span>
        </button>
      </div>

      <div className="space-y-3">
        {outline ? (
          outline.volumes.map((volume, index) => {
            const formatted = formatVolumeDesc(volume);
            const isOpen = openVolumeIndex === index;

            return (
              <article
                key={index}
                className={cn(
                  "overflow-hidden rounded-lg border transition-colors",
                  isOpen
                    ? "border-sky-300 bg-sky-50/40 dark:border-sky-500/30 dark:bg-sky-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenVolumeIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border text-xs font-black",
                        isOpen
                          ? "border-sky-300 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950"
                          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
                      )}
                    >
                      卷{index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                        {volume.name}
                      </h3>
                      {formatted.range ? (
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {formatted.range}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
                  />
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    {formatted.rest ? (
                      <p className="mb-4 rounded-lg border border-slate-200 bg-[#fbfcf8] p-3 text-sm font-medium leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                        {formatted.rest}
                      </p>
                    ) : null}

                    {formatted.segments.length ? (
                      <div className="space-y-3">
                        {formatted.segments.map((segment, segmentIndex) => {
                          const startChapter =
                            "startChapter" in segment && typeof segment.startChapter === "number"
                              ? segment.startChapter
                              : undefined;

                          return (
                            <div
                              key={`${segment.range}-${segmentIndex}`}
                              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_108px]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-black text-slate-950 dark:text-white">
                                    {segment.title}
                                  </h4>
                                  {segment.range ? (
                                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                      {segment.range}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                                  {segment.desc}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => goToChapter(getSegmentStart(segment.range, startChapter))}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10 dark:hover:text-sky-200"
                              >
                                编辑章节
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : formatted.bullets.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {formatted.bullets.map((bullet, bulletIndex) => (
                          <p
                            key={`${bullet}-${bulletIndex}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                          >
                            {bullet}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                        暂无章节段落
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
            暂无卷宗结构数据
          </div>
        )}
      </div>
    </section>
  );
}

function getSegmentStart(range: string, fallback?: number) {
  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return Number.parseInt(range.match(/\d+/)?.[0] || "1", 10);
}

"use client";

import { useState } from "react";
import { BookText, ChevronDown, Edit3, Layers, Quote } from "lucide-react";

import {
  formatChapterCount,
  formatVolumeDesc,
} from "@/lib/workbench/work-dashboard-format";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

export function WorkSynopsisCard({ dashboard }: { dashboard: WorkDashboardController }) {
  const { outline, work } = dashboard;
  const [expanded, setExpanded] = useState(false);
  const synopsis = work?.synopsis || outline?.synopsis || "暂无作品简介。";
  const shouldCollapse = synopsis.length > 220 || synopsis.split(/\r?\n/).length > 4;

  return (
    <section className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-800/50 dark:text-zinc-200">
            <BookText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">作品简介</h2>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">核心设定与卖点</p>
          </div>
        </div>
        <Quote className="h-6 w-6 text-zinc-200 dark:text-zinc-800" />
      </div>

      <p
        className={cn(
          "whitespace-pre-wrap rounded-2xl border border-zinc-200/50 bg-white/50 p-5 text-sm font-medium leading-relaxed text-zinc-700 shadow-inner dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-300",
          shouldCollapse && !expanded && "line-clamp-4",
        )}
      >
        {synopsis}
      </p>
      {shouldCollapse ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex h-9 items-center rounded-xl border border-zinc-200/80 bg-white px-4 text-xs font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {expanded ? "收起简介" : "展开简介"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function WorkVolumesPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    goToChapter,
    openOutlineRefineConfirm,
    openVolumeIndex,
    outline,
    outlineExtensionState,
    outlineRefineBusy,
    plannedChapterCount,
    targetChapterCount,
    setOpenVolumeIndex,
    work,
  } = dashboard;

  return (
    <section className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-800/50 dark:bg-blue-500/10 dark:text-blue-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">分卷结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">{outline ? `${outline.volumes.length}卷` : "0卷"}</span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">已规划 {formatChapterCount(plannedChapterCount || 0)}</span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">长期目标 {formatChapterCount(targetChapterCount || 0)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!work || outlineRefineBusy || !outlineExtensionState.allowed}
          onClick={openOutlineRefineConfirm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-5 text-sm font-bold text-amber-800 shadow-sm transition-all hover:bg-amber-100 hover:shadow-md hover:ring-1 hover:ring-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20 dark:hover:ring-amber-500/40"
        >
          <Edit3 className="h-4 w-4" />
          <span>{outlineRefineBusy ? "规划中..." : "规划下一段"}</span>
        </button>
      </div>

      <div className="space-y-4">
        {outline ? (
          outline.volumes.map((volume, index) => {
            const formatted = formatVolumeDesc(volume);
            const isOpen = openVolumeIndex === index;

            return (
              <article
                key={index}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-300",
                  isOpen
                    ? "border-blue-300/80 bg-blue-50/40 shadow-md ring-1 ring-blue-300/50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:ring-blue-500/20"
                    : "border-zinc-200/80 bg-white/80 shadow-sm hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:hover:border-zinc-700",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenVolumeIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border text-sm font-black shadow-sm",
                        isOpen
                          ? "border-blue-400 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-zinc-50"
                          : "border-zinc-200/80 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
                      )}
                    >
                      卷{index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-zinc-950 dark:text-white">
                        {volume.name}
                      </h3>
                      {formatted.range ? (
                        <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {formatted.range}
                        </p>
                      ) : null}
                      <p className="mt-1.5 inline-flex rounded-md bg-zinc-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                        {volume.detailLevel === "macro" ? "宏观卷纲 · 未解锁" : "可写卷 · 已展开"}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                    isOpen ? "bg-blue-100 dark:bg-blue-500/20" : "bg-zinc-100 group-hover:bg-zinc-200 dark:bg-zinc-800"
                  )}>
                    <ChevronDown
                      className={cn("h-4 w-4 text-zinc-500 transition-transform duration-300 dark:text-zinc-400", isOpen && "rotate-180 text-blue-600 dark:text-blue-400")}
                    />
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-blue-200/50 bg-white/50 p-5 dark:border-blue-500/20 dark:bg-zinc-950/50">
                    {formatted.rest ? (
                      <p className="mb-5 rounded-2xl border border-zinc-200/50 bg-white p-5 text-sm font-medium leading-relaxed text-zinc-600 shadow-inner dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-300">
                        {formatted.rest}
                      </p>
                    ) : null}

                    {formatted.segments.length ? (
                      <div className="space-y-4">
                        {formatted.segments.map((segment, segmentIndex) => {
                          const startChapter =
                            "startChapter" in segment && typeof segment.startChapter === "number"
                              ? segment.startChapter
                              : undefined;

                          return (
                            <div
                              key={`${segment.range}-${segmentIndex}`}
                              className="grid gap-4 rounded-2xl border border-zinc-200/50 bg-zinc-50/80 p-5 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/80 md:grid-cols-[minmax(0,1fr)_120px]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-base font-black text-zinc-950 dark:text-white">
                                    {segment.title}
                                  </h4>
                                  {segment.range ? (
                                    <span className="rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-400">
                                      {segment.range}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
                                  {segment.desc}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => goToChapter(getSegmentStart(segment.range, startChapter))}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:ring-1 hover:ring-blue-300 active:scale-[0.98] dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 dark:hover:ring-blue-500/40"
                              >
                                编辑章节
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : volume.detailLevel === "macro" ? (
                      <div className="rounded-2xl border border-dashed border-zinc-300/80 bg-zinc-50/50 p-6 text-sm font-bold leading-relaxed text-zinc-500 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-400">
                        这一卷目前只保留宏观方向。写完当前窗口约 70% 后，点击“规划下一段”再展开后续章节。
                      </div>
                    ) : formatted.bullets.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {formatted.bullets.map((bullet, bulletIndex) => (
                          <p
                            key={`${bullet}-${bulletIndex}`}
                            className="rounded-2xl border border-zinc-200/60 bg-zinc-50/80 p-4 text-sm font-medium leading-relaxed text-zinc-600 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 dark:text-zinc-300"
                          >
                            {bullet}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-300/80 p-8 text-center text-sm font-bold text-zinc-500 dark:border-zinc-700/80 dark:text-zinc-400">
                        暂无章节段落
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300/80 p-12 text-center text-sm font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700/80 dark:text-zinc-400">
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

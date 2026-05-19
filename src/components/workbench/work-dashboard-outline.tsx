"use client";
import { ChevronDown, Edit3, Layers } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StoryOutline } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { formatChapterCount, formatVolumeDesc } from "@/lib/workbench/work-dashboard-format";
import { cn } from "@/lib/utils";

export function WorkSynopsisCard() {
  return null;
}

function isLongOutline(outline: WorkDashboardController["outline"]): outline is StoryOutline {
  return Boolean(outline && Array.isArray((outline as Partial<StoryOutline>).volumes));
}

function isShortOutline(outline: WorkDashboardController["outline"]): outline is ShortStoryOutline {
  return Boolean(outline && Array.isArray((outline as Partial<ShortStoryOutline>).beats));
}

export function WorkShortStoryOutlinePanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const outline = isShortOutline(dashboard.outline) ? dashboard.outline : null;

  return (
    <section className="app-compact-panel p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[1.45rem] font-extrabold tracking-tight text-zinc-950 dark:text-white">短篇结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                {outline ? `${outline.beats.length} 个场景` : "0 个场景"}
              </span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                目标 {outline?.targetWords?.toLocaleString("zh-CN") ?? 0} 字
              </span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                {outline?.theme || "主题待定"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {outline ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-inner">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              开篇钩子
            </div>
            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--theme-text-secondary)]">
              {outline.hook}
            </p>
          </div>

          <div className="space-y-2.5">
            {outline.beats.map((beat) => (
              <article
                key={beat.index}
                className="grid gap-3 rounded-xl border border-[var(--theme-border)] bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:bg-zinc-950/80 dark:hover:border-emerald-500/30 md:grid-cols-[88px_minmax(0,1fr)_112px]"
              >
                <div className="flex h-10 w-fit items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-3 text-xs font-black text-[var(--theme-text-muted)] shadow-sm md:h-12 md:w-full">
                  场景 {beat.index}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-extrabold text-zinc-950 dark:text-white">{beat.title}</h3>
                  <p className="mt-1.5 text-sm font-medium leading-6 text-zinc-600 dark:text-zinc-300">
                    {beat.purpose}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-zinc-500 dark:text-zinc-400">
                    {beat.writingPrompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dashboard.goToChapter(beat.index)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md hover:ring-1 hover:ring-emerald-300 active:scale-[0.98] dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 dark:hover:ring-emerald-500/40"
                >
                  写作
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold uppercase tracking-wider text-zinc-500 dark:border-[var(--theme-border)] dark:text-zinc-400">
          暂无短篇结构数据
        </div>
      )}
    </section>
  );
}

export function WorkVolumesPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    goToChapter,
    nextChapterIndex,
    openOutlineRefineConfirm,
    openVolumeIndex,
    outline: rawOutline,
    outlineExtensionState,
    outlineRefineBusy,
    plannedChapterCount,
    targetChapterCount,
    setOpenVolumeIndex,
    work,
  } = dashboard;
  const outline = isLongOutline(rawOutline) ? rawOutline : null;
  const extendBlockedReason = !outlineExtensionState.allowed ? outlineExtensionState.reason : "";
  const blockingSegment = outline ? findBlockingSegmentAnchor(outline.volumes, nextChapterIndex) : null;
  const blockedSegmentReason = buildBlockedSegmentReason(blockingSegment, nextChapterIndex);

  return (
    <section className="app-compact-panel p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[1.45rem] font-extrabold tracking-tight text-zinc-950 dark:text-white">分卷结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                {outline ? `${outline.volumes.length}卷` : "0卷"}
              </span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                已规划 {formatChapterCount(plannedChapterCount || 0)}
              </span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-1 dark:bg-zinc-800/80">
                长期目标 {formatChapterCount(targetChapterCount || 0)}
              </span>
            </div>
          </div>
        </div>

        {extendBlockedReason ? (
          <Tooltip delay={0} closeDelay={0}>
            <TooltipTrigger>
              <button
                type="button"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,246,219,0.93))] px-5 text-sm font-bold text-amber-800 opacity-50 shadow-[0_14px_28px_-22px_rgba(180,83,9,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all hover:ring-1 hover:ring-amber-300 aria-disabled:cursor-not-allowed dark:border-amber-500/30 dark:bg-[linear-gradient(180deg,rgba(68,45,17,0.96),rgba(47,31,12,0.92))] dark:text-amber-200 dark:hover:ring-amber-500/40"
              >
                <Edit3 className="h-4 w-4" />
                <span>规划下一段</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[19rem] rounded-[1rem] border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(255,244,217,0.95))] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-amber-950 shadow-[0_20px_32px_-24px_rgba(180,83,9,0.3)] [--tooltip-bg:rgba(255,250,240,0.98)] [--tooltip-border:rgba(253,230,138,0.95)] [--tooltip-fg:rgba(120,53,15,0.96)] [--tooltip-shadow:0_20px_34px_-24px_rgba(180,83,9,0.28)] dark:border-amber-400/30 dark:bg-[linear-gradient(180deg,rgba(69,45,18,0.98),rgba(50,32,13,0.95))] dark:text-amber-100 dark:[--tooltip-bg:rgba(64,42,17,0.98)] dark:[--tooltip-border:rgba(251,191,36,0.28)] dark:[--tooltip-fg:rgba(254,243,199,0.98)] dark:[--tooltip-shadow:0_20px_34px_-24px_rgba(0,0,0,0.55)]">
              {extendBlockedReason}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            disabled={!work || outlineRefineBusy}
            onClick={openOutlineRefineConfirm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,246,219,0.93))] px-5 text-sm font-bold text-amber-800 shadow-[0_14px_28px_-22px_rgba(180,83,9,0.25),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,251,243,1),rgba(255,241,204,0.97))] hover:shadow-[0_18px_32px_-20px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,0.98)] hover:ring-1 hover:ring-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-[linear-gradient(180deg,rgba(68,45,17,0.96),rgba(47,31,12,0.92))] dark:text-amber-200 dark:hover:bg-[linear-gradient(180deg,rgba(77,50,20,0.98),rgba(57,37,15,0.94))] dark:hover:ring-amber-500/40"
          >
            <Edit3 className="h-4 w-4" />
            <span>{outlineRefineBusy ? "规划中..." : "规划下一段"}</span>
          </button>
        )}
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
                  "overflow-hidden rounded-xl border transition-all duration-300",
                  isOpen
                    ? "border-emerald-300/80 bg-emerald-50/40 shadow-md ring-1 ring-emerald-300/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                    : "border-[var(--theme-border)] bg-white/80 shadow-sm hover:border-[var(--theme-border)] hover:bg-zinc-50/80 hover:shadow dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:hover:border-[var(--theme-border)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenVolumeIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm",
                        isOpen
                          ? "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-50"
                          : "border-[var(--theme-border)] bg-zinc-50 text-zinc-600 dark:border-[var(--theme-border)] dark:bg-zinc-900 dark:text-zinc-300",
                      )}
                    >
                      卷 {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-[1rem] font-bold text-zinc-950 dark:text-white">{volume.name}</h3>
                      {formatted.range ? (
                        <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">{formatted.range}</p>
                      ) : null}
                      <p className="mt-1.5 inline-flex rounded-md bg-zinc-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                        {volume.detailLevel === "macro" ? "宏观卷纲" : "可写卷"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                      isOpen ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800",
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-zinc-500 transition-transform duration-300 dark:text-zinc-400",
                        isOpen && "rotate-180 text-emerald-600 dark:text-emerald-400",
                      )}
                    />
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-emerald-200/50 bg-white/50 p-4 dark:border-emerald-500/20 dark:bg-zinc-950/50">
                    {formatted.rest ? (
                      <p className="mb-4 rounded-xl border border-[var(--theme-border)] bg-white p-4 text-sm font-medium leading-7 text-zinc-600 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50 dark:text-zinc-300">
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
                          const endChapter =
                            "endChapter" in segment && typeof segment.endChapter === "number"
                              ? segment.endChapter
                              : undefined;
                          const segmentBounds = getSegmentBounds(segment.range, startChapter, endChapter);
                          const segmentTargetChapter = getSegmentTargetChapter(segmentBounds, nextChapterIndex);
                          const segmentLocked = segmentBounds.start > nextChapterIndex;

                          return (
                            <div
                              key={`${segment.range}-${segmentIndex}`}
                              className="grid gap-4 rounded-xl border border-[var(--theme-border)] bg-zinc-50/80 p-4 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80 md:grid-cols-[minmax(0,1fr)_112px]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-base font-bold text-zinc-950 dark:text-white">{segment.title}</h4>
                                  {segment.range ? (
                                    <span className="rounded-lg border border-[var(--theme-border)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-400">
                                      {segment.range}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2.5 text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-300">
                                  {segment.desc}
                                </p>
                              </div>
                              {segmentLocked ? (
                                <Tooltip delay={0} closeDelay={0}>
                                  <TooltipTrigger>
                                    <button
                                      type="button"
                                      aria-disabled="true"
                                      onClick={(event) => event.preventDefault()}
                                      className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200/90 bg-zinc-100/90 px-4 text-sm font-bold text-zinc-400 shadow-none transition-all aria-disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900/85 dark:text-zinc-600"
                                    >
                                      进入章节
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[19rem] rounded-[1rem] border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(255,244,217,0.95))] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-amber-950 shadow-[0_20px_32px_-24px_rgba(180,83,9,0.3)] [--tooltip-bg:rgba(255,250,240,0.98)] [--tooltip-border:rgba(253,230,138,0.95)] [--tooltip-fg:rgba(120,53,15,0.96)] [--tooltip-shadow:0_20px_34px_-24px_rgba(180,83,9,0.28)] dark:border-amber-400/30 dark:bg-[linear-gradient(180deg,rgba(69,45,18,0.98),rgba(50,32,13,0.95))] dark:text-amber-100 dark:[--tooltip-bg:rgba(64,42,17,0.98)] dark:[--tooltip-border:rgba(251,191,36,0.28)] dark:[--tooltip-fg:rgba(254,243,199,0.98)] dark:[--tooltip-shadow:0_20px_34px_-24px_rgba(0,0,0,0.55)]">
                                    {blockedSegmentReason}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => goToChapter(segmentTargetChapter)}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md hover:ring-1 hover:ring-emerald-300 active:scale-[0.98] dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 dark:hover:ring-emerald-500/40"
                                >
                                  进入章节
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : volume.detailLevel === "macro" ? (
                      <div className="rounded-xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 p-5 text-sm font-bold leading-7 text-zinc-500 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 dark:text-zinc-400">
                        这一卷目前只保留宏观方向。写完当前窗口约 70% 后，再展开后续章节规划。
                      </div>
                    ) : formatted.bullets.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {formatted.bullets.map((bullet, bulletIndex) => (
                          <p
                            key={`${bullet}-${bulletIndex}`}
                            className="rounded-xl border border-[var(--theme-border)] bg-zinc-50/80 p-4 text-sm font-medium leading-7 text-zinc-600 shadow-sm dark:border-[var(--theme-border)]/60 dark:bg-zinc-900/80 dark:text-zinc-300"
                          >
                            {bullet}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm font-bold text-zinc-500 dark:border-[var(--theme-border)] dark:text-zinc-400">
                        暂无章节段落
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold uppercase tracking-wider text-zinc-500 dark:border-[var(--theme-border)] dark:text-zinc-400">
            暂无分卷结构数据
          </div>
        )}
      </div>
    </section>
  );
}

type SegmentBounds = {
  start: number;
  end: number;
};

type BlockingSegmentAnchor = {
  volumeIndex: number;
  title: string;
  range: string;
};

function getSegmentBounds(range: string, fallbackStart?: number, fallbackEnd?: number): SegmentBounds {
  const numbers = Array.from(range.matchAll(/\d+/g), (match) => Number.parseInt(match[0], 10)).filter((value) =>
    Number.isFinite(value),
  );
  const startFromRange = numbers[0];
  const endFromRange = numbers[1];
  const start =
    typeof fallbackStart === "number" && Number.isFinite(fallbackStart) && fallbackStart > 0
      ? fallbackStart
      : startFromRange || 1;
  const end =
    typeof fallbackEnd === "number" && Number.isFinite(fallbackEnd) && fallbackEnd >= start
      ? fallbackEnd
      : endFromRange || start;

  return { start, end };
}

function getSegmentTargetChapter(segmentBounds: SegmentBounds, nextChapterIndex: number) {
  if (nextChapterIndex >= segmentBounds.start && nextChapterIndex <= segmentBounds.end) {
    return nextChapterIndex;
  }

  return segmentBounds.start;
}

function findBlockingSegmentAnchor(
  volumes: StoryOutline["volumes"],
  chapterIndex: number,
): BlockingSegmentAnchor | null {
  if (!chapterIndex || chapterIndex < 1) return null;

  for (let volumeIndex = 0; volumeIndex < volumes.length; volumeIndex += 1) {
    const volume = volumes[volumeIndex];
    const formatted = formatVolumeDesc(volume);

    for (const segment of formatted.segments) {
      const segmentBounds = getSegmentBounds(segment.range);
      if (chapterIndex >= segmentBounds.start && chapterIndex <= segmentBounds.end) {
        return {
          volumeIndex,
          title: segment.title,
          range: segment.range,
        };
      }
    }

    const volumeBounds = getSegmentBounds(
      formatted.range,
      typeof volume.startChapter === "number" ? volume.startChapter : undefined,
      typeof volume.endChapter === "number" ? volume.endChapter : undefined,
    );
    if (chapterIndex >= volumeBounds.start && chapterIndex <= volumeBounds.end) {
      return {
        volumeIndex,
        title: volume.name,
        range: formatted.range,
      };
    }
  }

  return null;
}

function buildBlockedSegmentReason(blockingSegment: BlockingSegmentAnchor | null, chapterIndex: number) {
  if (blockingSegment) {
    const title = blockingSegment.title.trim();
    const range = blockingSegment.range.trim();
    return `请先进入卷${blockingSegment.volumeIndex + 1}的「${title}」${range ? `（${range}）` : ""}，把前置章节写完后再继续。`;
  }

  return `请先从第${chapterIndex}章开始顺序写作，完成前置章节后再进入这一段。`;
}

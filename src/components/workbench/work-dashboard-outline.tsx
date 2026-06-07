"use client";
import { ChevronDown, Edit3, Layers } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShortStoryOutlineView } from "@/components/workbench/short-story-outline-view";
import type { StoryOutline } from "@/lib/create/outline-draft";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { formatChapterCount, formatVolumeDesc } from "@/lib/workbench/work-dashboard-format";
import { cn } from "@/lib/utils";

export function WorkSynopsisCard() {
  return null;
}

function isLongOutline(outline: WorkDashboardController["outline"]): outline is StoryOutline {
  return Boolean(outline && Array.isArray((outline as Partial<StoryOutline>).volumes));
}

export function WorkShortStoryOutlinePanel({ dashboard }: { dashboard: WorkDashboardController }) {
  return (
    <section className="app-compact-panel p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[1.45rem] font-extrabold tracking-tight text-[var(--theme-text-strong)]">短篇结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
              <span className="rounded-lg bg-[var(--theme-surface-soft)] px-2 py-1">
                一篇完结
              </span>
              <span className="rounded-lg bg-[var(--theme-surface-soft)] px-2 py-1">
                节点 / 正文 / 导出
              </span>
            </div>
          </div>
        </div>
      </div>

      <ShortStoryOutlineView
        outline={dashboard.work?.outline ?? dashboard.outline}
        rawOutline={dashboard.work?.rawOutline}
        onOpenBeat={(index) => dashboard.goToChapter(1, { beatIndex: index })}
      />
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[1.45rem] font-extrabold tracking-tight text-[var(--theme-text-strong)]">分卷结构</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
              <span className="rounded-lg bg-[var(--theme-surface-soft)] px-2 py-1">
                {outline ? `${outline.volumes.length}卷` : "0卷"}
              </span>
              <span className="rounded-lg bg-[var(--theme-surface-soft)] px-2 py-1">
                已规划 {formatChapterCount(plannedChapterCount || 0)}
              </span>
              <span className="rounded-lg bg-[var(--theme-surface-soft)] px-2 py-1">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-5 text-sm font-bold text-[var(--theme-warning-text)] opacity-50 shadow-[var(--theme-shadow-button)] transition-all hover:ring-1 hover:ring-[var(--theme-warning-border)] aria-disabled:cursor-not-allowed"
              >
                <Edit3 className="h-4 w-4" />
                <span>规划下一段</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[19rem] rounded-[1rem] border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-[var(--theme-warning-text)] shadow-[var(--theme-shadow-button)] [--tooltip-bg:var(--theme-warning-soft)] [--tooltip-border:var(--theme-warning-border)] [--tooltip-fg:var(--theme-warning-text)] [--tooltip-shadow:var(--theme-shadow-button)]">
              {extendBlockedReason}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            disabled={!work || outlineRefineBusy}
            onClick={openOutlineRefineConfirm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-5 text-sm font-bold text-[var(--theme-warning-text)] shadow-[var(--theme-shadow-button)] transition-all hover:-translate-y-0.5 hover:brightness-95 hover:ring-1 hover:ring-[var(--theme-warning-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                    ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] shadow-md ring-1 ring-[var(--theme-brand-border)]/50"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-sm hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-soft)] hover:shadow",
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
                          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-500)] text-white"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]",
                      )}
                    >
                      卷 {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-[1rem] font-bold text-[var(--theme-text-strong)]">{volume.name}</h3>
                      {formatted.range ? (
                        <p className="mt-1 text-xs font-bold text-[var(--theme-text-muted)]">{formatted.range}</p>
                      ) : null}
                      <p className="mt-1.5 inline-flex rounded-md bg-[var(--theme-surface-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                        {volume.detailLevel === "macro" ? "宏观卷纲" : "可写卷"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                      isOpen ? "bg-[var(--theme-brand-soft)]" : "bg-[var(--theme-surface-soft)]",
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[var(--theme-text-muted)] transition-transform duration-300",
                        isOpen && "rotate-180 text-[var(--theme-brand-text)]",
                      )}
                    />
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-[var(--theme-brand-border)] bg-[var(--theme-surface-soft)] p-4">
                    {formatted.rest ? (
                      <p className="mb-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 text-sm font-medium leading-7 text-[var(--theme-text-secondary)] shadow-inner">
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
                              className="grid gap-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_112px]"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-base font-bold text-[var(--theme-text-strong)]">{segment.title}</h4>
                                  {segment.range ? (
                                    <span className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                                      {segment.range}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2.5 text-sm font-medium leading-7 text-[var(--theme-text-secondary)]">
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
                                      className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--theme-border)]/90 bg-[var(--theme-surface-soft)]/90 px-4 text-sm font-bold text-[var(--theme-text-muted)] shadow-none transition-all aria-disabled:cursor-not-allowed"
                                    >
                                      进入章节
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[19rem] rounded-[1rem] border-[var(--theme-warning-border)]/80 bg-[var(--theme-warning-soft)] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-[var(--theme-warning-text)] shadow-[var(--theme-shadow-button)] [--tooltip-bg:var(--theme-warning-soft)] [--tooltip-border:var(--theme-warning-border)] [--tooltip-fg:var(--theme-warning-text)] [--tooltip-shadow:var(--theme-shadow-button)]">
                                    {blockedSegmentReason}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => goToChapter(segmentTargetChapter)}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-text)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-brand-border)] active:scale-[0.98]"
                                >
                                  进入章节
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : volume.detailLevel === "macro" ? (
                      <div className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-5 text-sm font-bold leading-7 text-[var(--theme-text-muted)]">
                        这一卷目前只保留宏观方向。写完当前窗口约 70% 后，再展开后续章节规划。
                      </div>
                    ) : formatted.bullets.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {formatted.bullets.map((bullet, bulletIndex) => (
                          <p
                            key={`${bullet}-${bulletIndex}`}
                            className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 text-sm font-medium leading-7 text-[var(--theme-text-secondary)] shadow-sm"
                          >
                            {bullet}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm font-bold text-[var(--theme-text-muted)]">
                        暂无章节段落
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center text-sm font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
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

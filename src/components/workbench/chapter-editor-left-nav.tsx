"use client";

import { BookOpen, CheckCircle2, Circle, Layers3, Plus } from "lucide-react";

import { formatRelativeTime } from "@/lib/dashboard/dashboard-format";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { formatWorkbenchDocumentLabel } from "@/lib/workbench/work-document-label";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

export function ChapterEditorLeftNav({
  editor,
}: {
  editor: WorkChapterEditorController;
}) {
  const {
    chapterIndex,
    chapterList,
    effectiveAiBusy,
    handleBatchAddChapters,
    maxChapterIndex,
    saving,
    goToChapter,
    work,
  } = editor;
  const isShortStory = isShortStoryWork(work?.workType);
  const writtenCount = chapterList.filter((chapter) => chapter.wordCount > 0).length;
  const totalCount = Math.max(maxChapterIndex, chapterList.length, 1);

  return (
    <aside className="hidden min-w-0 xl:block xl:h-full xl:min-h-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-card)]">
        <div className="border-b border-[var(--theme-divider)] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
              <Layers3 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                {isShortStory ? "正文导航" : "章节导航"}
              </p>
              <h2 className="mt-1 truncate text-sm font-black text-[var(--theme-text-strong)]">
                {work?.title || "写作工作台"}
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="已写" value={`${writtenCount}`} />
            <Metric label="全部" value={`${totalCount}`} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          <div className="space-y-1.5">
            {chapterList.length ? (
              chapterList.map((chapter) => {
                const active = chapter.index === chapterIndex;
                const edited = chapter.wordCount > 0;

                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => void goToChapter(chapter.index)}
                    disabled={saving || effectiveAiBusy}
                    className={cn(
                      "group flex w-full items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
                      active
                        ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                        : "border-transparent bg-transparent text-[var(--theme-text-secondary)] hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border",
                        active
                          ? "border-[var(--theme-brand-border)] bg-[var(--theme-surface-solid)]"
                          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)]",
                      )}
                    >
                      {edited ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--theme-success-text)]" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-[var(--theme-text-muted)]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black">
                        {formatWorkbenchDocumentLabel(chapter.index, work?.workType)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-80">
                        {chapter.title || (isShortStory ? "短篇正文" : "未命名章节")}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] opacity-65">
                        <BookOpen className="h-3 w-3" />
                        {chapter.wordCount.toLocaleString("zh-CN")} 字
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] px-4 py-8 text-center text-xs font-bold text-[var(--theme-text-muted)]">
                暂无章节数据
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--theme-divider)] p-3">
          <button
            type="button"
            onClick={() => void handleBatchAddChapters()}
            disabled={!work || saving || effectiveAiBusy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-black text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-button)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Plus className="h-4 w-4" />
            {isShortStory ? "补正文段落" : "批量补章节"}
          </button>
          <p className="mt-2 truncate text-center text-[10px] font-semibold text-[var(--theme-text-muted)]">
            最近更新 {chapterList[0] ? formatRelativeTime(chapterList[0].updatedAt) : "-"}
          </p>
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black tabular-nums text-[var(--theme-text-strong)]">
        {value}
      </div>
    </div>
  );
}

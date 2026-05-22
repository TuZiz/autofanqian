"use client";

import Link from "next/link";
import { BookOpen, Download, PenTool, Trash2, User as UserIcon } from "lucide-react";

import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardWork } from "@/lib/dashboard/dashboard-types";
import { getWorkTypeBadgeCopy, isShortStoryWork } from "@/shared/work-type";

type DashboardWorkCardProps = {
  canDeleteWork: boolean;
  deleteBusy: boolean;
  onDelete: (work: DashboardWork) => void;
  onWrite: (href: string) => void;
  work: DashboardWork;
};

export function DashboardWorkCard({
  canDeleteWork,
  deleteBusy,
  onDelete,
  onWrite,
  work,
}: DashboardWorkCardProps) {
  const tone = getEditorialTone(`${work.id}:${work.title}`);
  const chapterHref = `/dashboard/novel/${work.id}/chapter/${Math.max(1, work.chapter.index)}`;
  const progressParams = getProgressCopy(work);
  const chapterLine = getChapterLine(work);
  const wordStat = formatWordStat(work.wordCount);
  const ownerLine = work.owner?.name || work.owner?.email;
  const shortStory = isShortStoryWork(work.workType);
  const typeCopy = getWorkTypeBadgeCopy(work.workType);

  const progressPercent = progressParams.hasTarget
    ? Number(progressParams.percent)
    : work.completionPercent;
  const progressDisplay = progressParams.hasTarget
    ? progressParams.value
    : `${Math.round(progressPercent)}%`;

  return (
    <article className="app-compact-panel group relative flex flex-col gap-3 overflow-hidden p-3 transition-all hover:border-[var(--theme-border-strong)] lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-lg font-semibold text-white shadow-sm"
            style={{ backgroundImage: tone.coverGradient }}
          >
            {getTitleInitial(work.title)}
          </div>

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-secondary)]">
                {typeCopy.primary}
              </span>
              <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-secondary)]">
                {shortStory ? "一篇完结" : "连载作品"}
              </span>
              <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-secondary)]">
                {work.genreLabel || "未分类"}
              </span>
            </div>
            <Link
              href={`/dashboard/novel/${work.id}`}
              className="mb-1 block truncate text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)] transition-colors hover:text-[var(--theme-brand-600)]"
            >
              {work.title}
            </Link>
            <p className="flex items-center gap-2 text-xs font-bold text-[var(--theme-text-secondary)]">
              <BookOpen className="h-4 w-4" />
              <span className="truncate">{chapterLine}</span>
            </p>
            {ownerLine && (
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{ownerLine}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:pl-[60px] lg:ml-4 lg:w-[360px] lg:pl-0">
          <TableMetric label="字数" value={wordStat.value + wordStat.unit} />
          <TableMetric label={shortStory ? "场景" : "章节"} value={String(work.chapterCount)} />
          <TableMetric label="更新" value={formatRelativeTime(work.updatedAt)} />
          <ProgressMetric display={progressDisplay} label="进度" value={progressPercent} />
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-2 sm:pl-[60px] lg:ml-3 lg:pl-0">
        <button
          onClick={() => onWrite(chapterHref)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950"
        >
          <PenTool className="h-4 w-4" />
          <span className="hidden sm:inline">写作</span>
        </button>
        <ExportDownloadButton
          workId={work.id}
          scope={shortStory ? "short_story" : "book"}
          format="md"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] shadow-sm transition-all hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
          ariaLabel="导出"
          title="导出"
        >
          <Download className="h-5 w-5" />
        </ExportDownloadButton>
        {canDeleteWork && (
          <button
            disabled={deleteBusy}
            onClick={() => onDelete(work)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200/60 bg-red-50 text-red-600 shadow-sm transition-all hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            aria-label="删除"
            title="删除"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </article>
  );
}

function TableMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 truncate text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
        {value}
      </div>
    </div>
  );
}

function ProgressMetric({
  display,
  label,
  value,
}: {
  display: string;
  label: string;
  value: number;
}) {
  return (
    <div className="col-span-4 min-w-0 sm:col-span-4">
      <div className="mb-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-emerald-600 dark:text-emerald-400">{display}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 shadow-inner dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out dark:bg-emerald-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

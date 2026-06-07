"use client";

import Link from "next/link";
import { memo } from "react";
import {
  BookOpen,
  Download,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import { Button, StatusBadge } from "@/components/design-system";
import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getPlanningLabel,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardWork } from "@/lib/dashboard/dashboard-types";
import { getWorkTypeBadgeCopy, isShortStoryWork } from "@/shared/work-type";

type DashboardWorkCardProps = {
  active: boolean;
  canDeleteWork: boolean;
  deleteBusy: boolean;
  onDelete: (work: DashboardWork) => void;
  onOpen: (href: string) => void;
  work: DashboardWork;
};

function DashboardWorkCardComponent({
  active,
  canDeleteWork,
  deleteBusy,
  onDelete,
  onOpen,
  work,
}: DashboardWorkCardProps) {
  const tone = getEditorialTone(`${work.id}:${work.title}`);
  const coverUrl = work.coverImageUrl || work.coverUrl || null;
  const shortStory = isShortStoryWork(work.workType);
  const chapterHref = `/dashboard/novel/${work.id}/chapter/${Math.max(1, work.chapter.index)}`;
  const detailHref = `/dashboard/novel/${work.id}`;
  const progress = getProgressCopy(work);
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
  const wordStat = formatWordStat(work.wordCount);
  const typeCopy = getWorkTypeBadgeCopy(work.workType);
  const synopsis =
    work.synopsis?.trim() ||
    "暂无简介。打开作品驾驶舱后，可以补充简介、大纲和下一步写作目标。";
  const visibleTags = [work.genreLabel, ...work.tags].filter(Boolean).slice(0, 2);

  return (
    <article className="group relative overflow-hidden border-b border-[var(--theme-divider)] bg-transparent transition-all duration-200 last:border-b-0 hover:bg-[var(--theme-surface-hover)] lg:min-h-[68px]">
      {active ? (
        <div className="absolute inset-y-2 left-0 w-1 bg-[var(--theme-brand-600)] shadow-[0_0_18px_var(--theme-primary-glow)]" />
      ) : null}
      <div className="grid min-w-0 gap-2 p-2.5 lg:grid-cols-[minmax(260px,1.35fr)_150px_100px_92px_96px_minmax(150px,0.8fr)_132px] lg:items-center lg:px-3 lg:py-2">
        <div className="flex min-w-0 gap-3">
          <div className="relative shrink-0">
            <WorkThumb coverUrl={coverUrl} gradient={tone.coverGradient} title={work.title} />
            <div
              className="pointer-events-none absolute -inset-1 rounded-[3px] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-30"
              style={{ backgroundImage: tone.coverGradient }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 lg:hidden">
              <StatusBadge className="rounded-[3px] px-1.5 py-0.5 text-[10px]" tone="ai">{typeCopy.primary}</StatusBadge>
              {visibleTags.map((tag) => (
                <StatusBadge className="rounded-[3px] px-1.5 py-0.5 text-[10px]" key={tag}>{tag}</StatusBadge>
              ))}
            </div>
            <Link
              href={detailHref}
              className="block truncate text-sm font-extrabold tracking-tight text-[var(--theme-text-strong)] transition hover:text-[var(--theme-brand-600)] sm:text-base"
              title={work.title}
            >
              {work.title}
            </Link>

            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--theme-text-secondary)]">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{getChapterLine(work)}</span>
            </p>
            <p className="mt-1 truncate text-xs leading-5 text-[var(--theme-text-secondary)] lg:hidden">
              {synopsis}
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-wrap gap-1.5 lg:flex">
          <StatusBadge className="rounded-[3px] px-1.5 py-0.5 text-[10px]" tone="ai">{typeCopy.primary}</StatusBadge>
          {visibleTags.map((tag) => (
            <StatusBadge className="rounded-[3px] px-1.5 py-0.5 text-[10px]" key={tag}>{tag}</StatusBadge>
          ))}
        </div>

        <Metric label="字数" value={`${wordStat.value}${wordStat.unit}`} />
        <Metric label={shortStory ? "场景" : "章节"} value={String(work.chapterCount)} />
        <Metric label="更新" value={formatRelativeTime(work.updatedAt)} />

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold">
            <span className="truncate text-[var(--theme-text-muted)]">{progress.label}</span>
            <span className="shrink-0 text-[var(--theme-brand-text)]">{progress.value}</span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-[2px] bg-[var(--theme-surface-overlay)]">
            <div
              className="theme-brand-gradient-bg absolute inset-y-0 left-0 rounded-[2px] transition-[width] duration-700"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <p className="mt-1 hidden truncate text-[11px] leading-4 text-[var(--theme-text-muted)] xl:block">
            {getPlanningLabel(work)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          {active ? (
            <Button
              type="button"
              tone="secondary"
              disabled
              className="min-h-8 min-w-[82px] rounded-[4px] px-2.5 text-xs text-[var(--theme-brand-text)] shadow-none"
            >
              正在编辑
            </Button>
          ) : (
            <Button
              type="button"
              tone="secondary"
              onClick={() => onOpen(detailHref)}
              className="min-h-8 min-w-[64px] rounded-[4px] px-2.5 text-xs shadow-none"
            >
              打开
            </Button>
          )}
          <div className="flex items-center gap-1">
            <ExportDownloadButton
              workId={work.id}
              scope={shortStory ? "short_story" : "book"}
              format="md"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
              ariaLabel="导出作品"
              title="导出作品"
            >
              <Download className="h-4 w-4" />
            </ExportDownloadButton>
            {canDeleteWork ? (
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => onDelete(work)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                aria-label="删除作品"
                title="删除作品"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={chapterHref}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
                title="更多操作"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export const DashboardWorkCard = memo(DashboardWorkCardComponent);

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[4px] bg-[var(--theme-surface-soft)] px-2 py-1.5 transition-colors group-hover:bg-[var(--theme-surface-overlay)] lg:bg-transparent lg:px-0 lg:py-0">
      <div className="truncate text-[11px] font-bold text-[var(--theme-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-[var(--theme-text-strong)]">
        {value}
      </div>
    </div>
  );
}

function WorkThumb({
  coverUrl,
  gradient,
  title,
}: {
  coverUrl: string | null;
  gradient: string;
  title: string;
}) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-white/10 bg-[var(--theme-card-secondary)] text-lg font-extrabold text-white shadow-[var(--theme-shadow-button)] transition-transform duration-200 group-hover:scale-105">
      {coverUrl ? (
        <span
          aria-label={`${title} 缩略图`}
          className="h-full w-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundImage: gradient }}
        >
          {getTitleInitial(title)}
        </span>
      )}
    </div>
  );
}

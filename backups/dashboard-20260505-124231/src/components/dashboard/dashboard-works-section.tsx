"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  PenLine,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardFilters, DashboardSortKey, DashboardWork } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";

type DashboardWorksSectionProps = {
  dashboard: DashboardClientController;
};

export function DashboardWorksSection({ dashboard }: DashboardWorksSectionProps) {
  const {
    deleteBusy,
    filters,
    openDeleteDialog,
    overview,
    overviewError,
    overviewLoading,
    updateFilters,
    user,
  } = dashboard;

  const works = useMemo(() => overview?.works ?? [], [overview?.works]);
  const pagination = overview?.pagination;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedWorks = useMemo(
    () => works.filter((work) => selectedIds.includes(work.id)),
    [selectedIds, works],
  );

  const allVisibleSelected = works.length > 0 && works.every((work) => selectedIds.includes(work.id));

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !works.some((work) => work.id === id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...works.map((work) => work.id)])));
  }

  function clearFilters() {
    updateFilters({
      genreId: "",
      owner: "",
      page: 1,
      q: "",
      sort: "updated_desc",
      tag: "",
    });
  }

  function exportSelected(format: "markdown" | "txt" = "txt") {
    selectedWorks.forEach((work) => {
      window.open(
        `/api/works/${encodeURIComponent(work.id)}/export?format=${format}`,
        "_blank",
        "noopener,noreferrer",
      );
    });
  }

  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold leading-tight text-[var(--theme-text-strong)]">
            {user?.isAdmin ? "全部用户作品" : "我的作品"}
          </h2>
          <p className="mt-1.5 text-[13px] text-[var(--theme-text-muted)]">
            共 {pagination?.total ?? works.length} 部作品，默认按最近更新排序。
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            className="theme-button-secondary inline-flex h-10 items-center justify-center gap-2 border-[#eee9df] bg-white px-4 text-[13px] font-medium shadow-none dark:border-white/10 dark:bg-white/[0.04]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--theme-text-muted)]" />
            筛选
            <ChevronDown
              className={cn(
                "h-4 w-4 text-[var(--theme-text-muted)] transition-transform",
                filtersOpen && "rotate-180",
              )}
            />
          </button>

          <Link
            href="/dashboard/create"
            className="theme-button-primary inline-flex h-10 items-center justify-center gap-2 px-4 text-[13px] font-bold"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </Link>
        </div>
      </div>

      {filtersOpen ? (
        <FilterPanel
          filters={filters}
          isAdmin={Boolean(user?.isAdmin)}
          onClear={clearFilters}
          onUpdate={updateFilters}
        />
      ) : null}

      {overviewError ? (
        <div className="mb-4 border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--theme-danger-text)]">
          {overviewError}
        </div>
      ) : null}

      {works.length ? (
        <>
          <div className="overflow-hidden border border-[#f0ece4] bg-white shadow-[0_34px_88px_-62px_rgba(28,25,23,0.2)] dark:border-white/10 dark:bg-[#1c1917] dark:shadow-[0_34px_88px_-62px_rgba(0,0,0,0.9)]">
            <div className="flex flex-col gap-2.5 border-b border-[#f0ece4] bg-[#fffefc] px-4 py-2.5 text-[13px] text-[var(--theme-text-muted)] dark:border-white/10 dark:bg-[#191715] sm:flex-row sm:items-center sm:justify-between xl:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <span>共 {pagination?.total ?? works.length} 部</span>
                {selectedWorks.length ? (
                  <span className="theme-chip-success px-2 py-0.5 text-[12px] font-medium">
                    已选 {selectedWorks.length}
                  </span>
                ) : null}
                {overviewLoading ? (
                  <span className="theme-chip inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] text-[var(--theme-text-muted)]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    同步中
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={toggleAllVisible} className="theme-link-muted text-[13px]">
                  {allVisibleSelected ? "取消本页" : "选择本页"}
                </button>

                {selectedWorks.length ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportSelected("txt")}
                      className="theme-button-secondary inline-flex h-9 items-center gap-1.5 px-3 text-[13px] font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-[#f0ece4]">
              {works.map((work) => (
                <WorkRow
                  key={work.id}
                  work={work}
                  isSelected={selectedIds.includes(work.id)}
                  onToggleSelected={toggleSelected}
                  onDelete={openDeleteDialog}
                  deleteBusy={deleteBusy}
                  userId={user?.id}
                  userIsAdmin={Boolean(user?.isAdmin)}
                />
              ))}
            </div>
          </div>

          {pagination ? (
            <PaginationBar
              page={pagination.page}
              pageCount={pagination.pageCount}
              total={pagination.total}
              onPageChange={(next) => updateFilters({ page: next })}
            />
          ) : null}
        </>
      ) : (
        <EmptyWorksState hasFilters={hasActiveFilter(filters)} />
      )}
    </section>
  );
}

function FilterPanel({
  filters,
  isAdmin,
  onClear,
  onUpdate,
}: {
  filters: DashboardFilters;
  isAdmin: boolean;
  onClear: () => void;
  onUpdate: (next: Partial<DashboardFilters>) => void;
}) {
  return (
    <div className="mb-4 border border-[#eee9df] bg-white px-4 py-4 shadow-[0_24px_68px_-54px_rgba(28,25,23,0.18)] dark:border-white/10 dark:bg-[#1c1917] dark:shadow-[0_24px_68px_-54px_rgba(0,0,0,0.9)]">
      <div className="grid gap-3 md:grid-cols-3">
        <FilterField
          label="关键词"
          value={filters.q}
          placeholder="标题 / 章节 / 标签"
          icon={<Search className="h-4 w-4 text-[var(--theme-text-muted)]" />}
          onChange={(q) => onUpdate({ q, page: 1 })}
        />

        <FilterField
          label="标签"
          value={filters.tag}
          placeholder="例如：都市、玄幻"
          onChange={(tag) => onUpdate({ tag, page: 1 })}
        />

        {isAdmin ? (
          <FilterField
            label="作者"
            value={filters.owner}
            placeholder="邮箱 / 编号"
            icon={<UserRound className="h-4 w-4 text-[var(--theme-text-muted)]" />}
            onChange={(owner) => onUpdate({ owner, page: 1 })}
          />
        ) : (
          <FilterSelectField
            label="排序"
            value={filters.sort}
            options={[
              ["updated_desc", "最近更新"],
              ["updated_asc", "最早更新"],
              ["word_desc", "字数从高到低"],
              ["word_asc", "字数从低到高"],
              ["progress_desc", "进度从高到低"],
              ["progress_asc", "进度从低到高"],
              ["title_asc", "标题 A-Z"],
              ["title_desc", "标题 Z-A"],
            ]}
            onChange={(sort) => onUpdate({ sort: sort as DashboardSortKey, page: 1 })}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <FilterSelectField
          label="排序"
          value={filters.sort}
          options={[
            ["updated_desc", "最近更新"],
            ["updated_asc", "最早更新"],
            ["word_desc", "字数从高到低"],
            ["word_asc", "字数从低到高"],
            ["progress_desc", "进度从高到低"],
            ["progress_asc", "进度从低到高"],
            ["title_asc", "标题 A-Z"],
            ["title_desc", "标题 Z-A"],
          ]}
          onChange={(sort) => onUpdate({ sort: sort as DashboardSortKey, page: 1 })}
        />

        <button
          type="button"
          onClick={onClear}
          className="theme-button-secondary inline-flex h-10 items-center justify-center px-4 text-[13px] font-medium"
        >
          清空筛选
        </button>
      </div>
    </div>
  );
}

function WorkRow({
  work,
  isSelected,
  onToggleSelected,
  onDelete,
  deleteBusy,
  userId,
  userIsAdmin,
}: {
  work: DashboardWork;
  isSelected: boolean;
  onToggleSelected: (id: string) => void;
  onDelete: (work: DashboardWork) => void;
  deleteBusy: boolean;
  userId?: string;
  userIsAdmin: boolean;
}) {
  const workHref = `/dashboard/novel/${work.id}`;
  const chapterHref = `/dashboard/novel/${work.id}/chapter/${Math.max(1, work.chapter.index)}`;
  const wordStat = formatWordStat(work.wordCount);
  const canDeleteWork = Boolean(userIsAdmin || work.owner.id === userId);
  const progress = getProgressCopy(work);
  const tone = getEditorialTone(`${work.id}:${work.title}`);
  const genreOrTag = work.genreLabel || work.tag || "未分类";
  const progressValue = progress.hasTarget ? progress.percent : work.completionPercent;
  const chapterLine = getChapterLine(work);
  const ownerLine = userIsAdmin ? `ID ${work.owner.code} · ${work.owner.email}` : null;
  const progressDisplay = progress.hasTarget ? progress.value : `${Math.max(0, Math.min(100, Math.round(progressValue || 0)))}%`;

  return (
    <article className="group px-4 py-3 transition-colors hover:bg-[#fbfaf7] dark:hover:bg-white/[0.04] xl:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(344px,0.54fr)_auto] lg:items-center xl:grid-cols-[minmax(0,1fr)_minmax(392px,0.6fr)_auto] 2xl:grid-cols-[minmax(0,1fr)_minmax(456px,0.64fr)_auto]">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={() => onToggleSelected(work.id)}
            aria-label={`选择 ${work.title}`}
            className={cn(
              "mt-3.5 flex h-5 w-5 shrink-0 items-center justify-center border transition",
              isSelected
                ? "border-[var(--theme-text-strong)] bg-[var(--theme-text-strong)] text-[var(--theme-bg)]"
                : "border-[var(--theme-border-strong)] bg-[var(--theme-surface-solid)] text-transparent hover:border-[var(--theme-text-muted)]",
            )}
          >
            <Check className="h-3 w-3" />
          </button>

          <Link
            href={workHref}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-[18px] font-bold text-white shadow-sm"
            style={{ backgroundImage: tone.coverGradient }}
            aria-label={`查看 ${work.title}`}
          >
            {getTitleInitial(work.title)}
          </Link>

          <div className="min-w-0 flex-1 pr-0 lg:pr-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={workHref} className="min-w-0" title={work.title}>
                <h3 className="truncate text-[16px] font-bold text-[var(--theme-text-strong)] hover:text-[var(--theme-brand-600)]">
                  《{work.title}》
                </h3>
              </Link>
              <span className="border border-[#eee9df] bg-white px-2 py-0.5 text-[12px] text-[var(--theme-text-muted)] dark:border-white/10 dark:bg-white/[0.04]">
                {genreOrTag}
              </span>
            </div>

            <p className="mt-1 flex min-w-0 items-center gap-2 text-[13px] text-[var(--theme-text-secondary)]">
              <BookOpen className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" />
              <span className="truncate" title={chapterLine}>
                {chapterLine}
              </span>
            </p>

            {userIsAdmin ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--theme-text-muted)]">
                <UserRound className="h-4 w-4 shrink-0" />
                <span className="truncate" title={ownerLine ?? undefined}>
                  ID {work.owner.code} <span className="text-[var(--theme-text-disabled)]">·</span> {work.owner.email}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-2 pl-[76px] sm:grid-cols-4 sm:pl-[78px] lg:grid-cols-[58px_48px_64px_116px] lg:gap-x-4 lg:pl-0 xl:grid-cols-[64px_54px_72px_128px]">
          <TableMetric label="字数" value={`${wordStat.value}${wordStat.unit}`} />
          <TableMetric label="章节" value={String(work.chapterCount)} />
          <TableMetric label="更新" value={formatRelativeTime(work.updatedAt)} />
          <ProgressMetric value={progressValue} label="进度" display={progressDisplay} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[76px] sm:pl-[78px] lg:justify-end lg:pl-3">
          <Link
            href={chapterHref}
            className="theme-button-primary inline-flex h-9 items-center gap-2 px-3.5 text-[13px] font-bold"
          >
            <PenLine className="h-4 w-4" />
            写作
          </Link>
          <a
            href={`/api/works/${encodeURIComponent(work.id)}/export?format=markdown`}
            target="_blank"
            rel="noopener noreferrer"
            className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 border-[#eee9df] bg-white px-3 text-[13px] font-bold shadow-none dark:border-white/10 dark:bg-white/[0.04]"
            aria-label={`导出 ${work.title}`}
            title="导出 Markdown"
          >
            <Download className="h-4 w-4" />
            导出
          </a>
          {canDeleteWork ? (
            <button
              type="button"
              onClick={() => onDelete(work)}
              disabled={deleteBusy}
              className="theme-icon-button flex h-9 w-9 items-center justify-center border-[#eee9df] bg-white p-0 text-[var(--theme-text-muted)] shadow-none transition hover:text-[var(--theme-danger-text)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04]"
              aria-label={`删除 ${work.title}`}
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TableMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[58px] text-left">
      <div className="text-[12px] text-[var(--theme-text-muted)]">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-bold text-[var(--theme-text-strong)]">{value}</div>
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
  const width = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-[var(--theme-text-muted)]">
        <span>{label}</span>
        <span className="font-medium text-[var(--theme-brand-600)]">{display}</span>
      </div>
      <div className="relative h-1.5 bg-[#f1eee6] dark:bg-white/10">
        {width > 0 ? (
          <div className="h-full bg-[var(--theme-brand-500)]" style={{ width: `${width}%` }} />
        ) : null}
        <div
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-[var(--theme-brand-600)] ring-2 ring-white"
          style={{ left: `${width}%` }}
        />
      </div>
    </div>
  );
}

function FilterField({
  icon,
  label,
  onChange,
  placeholder,
  value,
}: {
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11px] font-semibold text-[var(--theme-text-muted)]">
        {label}
      </Label>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span> : null}
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 120))}
            placeholder={placeholder}
            className={cn(
              "theme-input h-10 rounded-xl px-3 text-sm",
              icon && "pl-8",
            )}
          />
      </div>
    </div>
  );
}

function FilterSelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[11px] font-semibold text-[var(--theme-text-muted)]">
        {label}
      </Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-select h-10 w-full rounded-xl px-3 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function PaginationBar({
  onPageChange,
  page,
  pageCount,
  total,
}: {
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  total: number;
}) {
  const safePageCount = Math.max(1, pageCount);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--theme-text-muted)]">
      <p>
        共 {total} 条，第 {page} / {safePageCount} 页
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="theme-button-secondary h-9 rounded-xl px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:text-[var(--theme-text-disabled)]"
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, page + 1))}
          className="theme-button-secondary h-9 rounded-xl px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:text-[var(--theme-text-disabled)]"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function EmptyWorksState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-6 py-10 text-center shadow-[var(--theme-shadow-panel)]">
      <FileText className="h-9 w-9 text-[var(--theme-text-disabled)]" />
      <h3 className="mt-4 text-base font-bold text-[var(--theme-text-strong)]">
        {hasFilters ? "没有匹配的作品" : "还没有作品"}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">
        {hasFilters ? "尝试放宽筛选条件，或者换一个关键词再搜索。" : "从新建作品开始，工作台会逐步形成你的创作总览。"}
      </p>
      {!hasFilters ? (
        <Link
          href="/dashboard/create"
          className="theme-button-primary mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          新建第一部作品
        </Link>
      ) : null}
    </div>
  );
}

function hasActiveFilter(filters: DashboardFilters) {
  return Boolean(filters.q.trim() || filters.genreId.trim() || filters.tag.trim() || filters.owner.trim());
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import {
  Search,
  Filter, FileText, User as UserIcon, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { DashboardWorkCard } from "@/components/dashboard/dashboard-work-card";
import type { DashboardFilters } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import {
  getWorkLibraryEmptyCopy,
  hasActiveWorkLibraryFilter,
} from "@/lib/dashboard/work-library-filter";
import { cn } from "@/lib/utils";
import type { WorkLibraryTypeFilter } from "@/shared/work-type";

type DashboardWorksSectionProps = {
  dashboard: DashboardClientController;
};

export function DashboardWorksSection({ dashboard }: DashboardWorksSectionProps) {
  const {
    deleteBusy,
    filters,
    openDeleteDialog,
    overview,
    updateFilters,
    user,
  } = dashboard;
  const router = useRouter();

  const works = overview?.works ?? [];
  const totalWorks = overview?.pagination?.total ?? 0;
  const hasFilters = hasActiveWorkLibraryFilter(filters);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const page = filters.page;
  const pageCount = Math.ceil(totalWorks / filters.pageSize);

  return (
    <section className="flex flex-col gap-3">
      {/* 工具栏区 */}
      <div className="app-compact-panel flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold tracking-tight text-[var(--theme-text-strong)]">
              我的作品宇宙
            </h3>
            <span className="rounded-md bg-[var(--theme-brand-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
              {totalWorks} 部
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TypeFilterTabs
              value={filters.type}
              onChange={(value) => updateFilters({ type: value })}
            />

            <div className="group relative flex h-9 w-full items-center overflow-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-emerald-500/15 sm:w-[240px]">
              <div className="pl-3 text-zinc-400 group-focus-within:text-[var(--theme-brand-600)]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => updateFilters({ q: e.target.value })}
                placeholder="搜索标题、标签..."
                className="h-full w-full bg-transparent px-2 text-sm font-bold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold shadow-sm transition-all active:scale-[0.98]",
                filterExpanded || hasFilters
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  : "border-[var(--theme-border)] bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              )}
            >
              <Filter className="h-4 w-4" />
              {hasFilters ? "已过滤" : "筛选"}
            </button>

            <button
              onClick={() => router.push("/dashboard/create")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新建</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {filterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-[var(--theme-border)] pt-5 dark:border-[var(--theme-border)]">
                <FilterSelectField
                  label="类型"
                  value={filters.genreId}
                  onChange={(v) => updateFilters({ genreId: v })}
                  options={[
                    ["", "全部类型"],
                    ["玄幻", "玄幻"],
                    ["奇幻", "奇幻"],
                    ["武侠", "武侠"],
                    ["仙侠", "仙侠"],
                    ["都市", "都市"],
                    ["现实", "现实"],
                    ["军事", "军事"],
                    ["历史", "历史"],
                    ["游戏", "游戏"],
                    ["体育", "体育"],
                    ["科幻", "科幻"],
                    ["悬疑", "悬疑"],
                    ["轻小说", "轻小说"],
                    ["短篇", "短篇"],
                  ]}
                />
                <FilterField
                  label="状态标签"
                  value={filters.tag}
                  onChange={(v) => updateFilters({ tag: v })}
                  placeholder="如：连载中、已完结"
                />
                <FilterField
                  label="创建人"
                  icon={<UserIcon className="h-4 w-4 text-zinc-400" />}
                  value={filters.owner}
                  onChange={(v) => updateFilters({ owner: v })}
                  placeholder="输入作者邮箱或 ID"
                />
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">排序</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilters({ sort: e.target.value as DashboardFilters["sort"] })}
                    className="h-10 rounded-xl border border-[var(--theme-border)] bg-white/80 px-4 text-sm font-bold text-zinc-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-300 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
                  >
                    <option value="updated_desc">最近更新</option>
                    <option value="created_desc">最新创建</option>
                    <option value="word_desc">字数最多</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 作品列表区 */}
      <div className="flex flex-col gap-2.5">
        {works.length > 0 ? (
          works.map((work) => (
            <DashboardWorkCard
              key={work.id}
              canDeleteWork={Boolean(user?.isAdmin || user?.id === work.owner?.id)}
              deleteBusy={deleteBusy}
              onDelete={() => openDeleteDialog(work)}
              onWrite={(href) => router.push(href)}
              work={work}
            />
          ))
        ) : (
          <EmptyWorksState filters={filters} onCreate={() => router.push("/dashboard/create")} />
        )}
      </div>

      {pageCount > 1 && (
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={totalWorks}
          onPageChange={(p) => updateFilters({ page: p })}
        />
      )}
    </section>
  );
}

function FilterField({
  icon,
  label,
  onChange,
  placeholder,
  value,
}: {
  icon?: ReactElement;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block min-w-[200px] flex-1">
      <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex h-12 w-full items-center rounded-xl border border-[var(--theme-border)] bg-white/80 px-4 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
        {icon && <div className="mr-3">{icon}</div>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 120))}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm font-bold text-zinc-900 placeholder:text-zinc-400 outline-none dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>
    </label>
  );
}

function TypeFilterTabs({
  onChange,
  value,
}: {
  onChange: (value: WorkLibraryTypeFilter) => void;
  value: WorkLibraryTypeFilter;
}) {
  const options: Array<{ label: string; value: WorkLibraryTypeFilter }> = [
    { label: "全部", value: "all" },
    { label: "长篇", value: "long" },
    { label: "短篇", value: "short" },
  ];

  return (
    <div
      className="flex h-9 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-0.5 shadow-sm"
      aria-label="作品类型筛选"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-8 items-center rounded px-3 text-xs font-bold transition-all",
              active
                ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
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
    <label className="block min-w-[200px] flex-1">
      <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-white/80 px-4 text-sm font-bold text-zinc-900 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
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
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/60 bg-white/70 px-6 py-4 shadow-sm ring-1 ring-[var(--theme-border)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-[var(--theme-border)]">
      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        共 <span className="font-bold text-zinc-950 dark:text-white">{total}</span> 部作品，第 <span className="font-bold text-zinc-950 dark:text-white">{page} / {safePageCount}</span> 页
      </p>
      <div className="flex gap-3">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
        >
          上一页
        </button>
        <button
          disabled={page >= safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, page + 1))}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function EmptyWorksState({
  filters,
  onCreate,
}: {
  filters: DashboardFilters;
  onCreate: () => void;
}) {
  const copy = getWorkLibraryEmptyCopy(filters);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 p-10 text-center shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-100/80 text-zinc-400 shadow-inner ring-1 ring-[var(--theme-border)] dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-[var(--theme-border)]">
        <FileText className="h-8 w-8" aria-hidden />
      </div>
      <h3 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
        {copy.title}
      </h3>
      <p className="mt-3 max-w-md text-sm font-bold leading-relaxed text-zinc-500 dark:text-zinc-400">
        {copy.description}
      </p>
      {copy.canCreate && (
        <button
          onClick={onCreate}
          className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/25 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Plus className="h-5 w-5" />
          新建作品
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button, FieldShell, StatusBadge } from "@/components/design-system";
import type { DashboardFilters } from "@/lib/dashboard/dashboard-types";
import { hasActiveWorkLibraryFilter } from "@/lib/dashboard/work-library-filter";
import { cn } from "@/lib/utils";
import type { WorkLibraryTypeFilter } from "@/shared/work-type";

type DashboardWorksFiltersProps = {
  filters: DashboardFilters;
  loading: boolean;
  onChange: (next: Partial<DashboardFilters>) => void;
  totalWorks: number;
};

const RESET_FILTERS = {
  genreId: "",
  owner: "",
  q: "",
  tag: "",
  type: "all" as const,
};

const FILTER_TYPE_OPTIONS: Array<{ label: string; value: WorkLibraryTypeFilter }> = [
  { label: "全部", value: "all" },
  { label: "长篇", value: "long" },
  { label: "短篇", value: "short" },
  { label: "导入", value: "imported" },
];

export function DashboardWorksFilters({
  filters,
  loading,
  onChange,
  totalWorks,
}: DashboardWorksFiltersProps) {
  const { genreId, owner, q, sort, tag } = filters;
  const [draft, setDraft] = useState(filters);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const hasFilters = hasActiveWorkLibraryFilter(filters);
  const hasDraftChanges = useMemo(() => {
    return (
      draft.genreId !== genreId ||
      draft.owner !== owner ||
      draft.sort !== sort ||
      draft.tag !== tag
    );
  }, [draft.genreId, draft.owner, draft.sort, draft.tag, genreId, owner, sort, tag]);

  useEffect(() => {
    if (draft.q === q) return;

    const timer = window.setTimeout(() => {
      onChange({ q: draft.q.trim() });
    }, 360);

    return () => window.clearTimeout(timer);
  }, [draft.q, onChange, q]);

  function updateDraft(next: Partial<DashboardFilters>) {
    setDraft((current) => ({
      ...current,
      ...next,
    }));
  }

  function applyAdvancedFilters() {
    onChange({
      genreId: draft.genreId.trim(),
      owner: draft.owner.trim(),
      sort: draft.sort,
      tag: draft.tag.trim(),
    });
  }

  function resetFilters() {
    setDraft((current) => ({
      ...current,
      ...RESET_FILTERS,
    }));
    onChange(RESET_FILTERS);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <TypeFilterTabs
            disabled={loading}
            value={filters.type}
            onChange={(value) => {
              updateDraft({ type: value });
              onChange({ type: value });
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterExpanded((value) => !value)}
              aria-expanded={filterExpanded}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-[4px] border px-3 text-sm font-bold transition duration-200 active:translate-y-px",
                filterExpanded || hasFilters
                  ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
              )}
            >
              <Filter className="h-4 w-4" />
              {hasFilters ? "已筛选" : "筛选"}
            </button>
            {hasFilters ? (
              <Button type="button" tone="ghost" icon={X} onClick={resetFilters} disabled={loading} className="min-h-9 px-3">
                清空
              </Button>
            ) : null}
          </div>
        </div>

        <form
          role="search"
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ q: draft.q.trim() });
          }}
        >
          <FieldShell
            aria-label="搜索作品"
            icon={Search}
            value={draft.q}
            onChange={(event) => updateDraft({ q: event.target.value.slice(0, 120) })}
            placeholder="搜索标题、标签、章节或作者"
            className="h-9 w-full rounded-[4px] xl:w-[360px]"
          />
          <Button
            type="submit"
            tone="secondary"
            icon={loading ? Loader2 : Search}
            disabled={loading || draft.q.trim() === filters.q.trim()}
            className={cn("min-h-9 rounded-[4px] px-3", loading && "[&_svg]:animate-spin")}
          >
            搜索
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--theme-text-muted)]">
        {loading ? (
          <StatusBadge tone="ai">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在刷新作品库
          </StatusBadge>
        ) : (
          <StatusBadge>共 {totalWorks} 部作品</StatusBadge>
        )}
        {filters.q.trim() ? <StatusBadge tone="ai">关键词：{filters.q.trim()}</StatusBadge> : null}
        {filters.genreId.trim() ? <StatusBadge>题材：{filters.genreId.trim()}</StatusBadge> : null}
        {filters.tag.trim() ? <StatusBadge>状态：{filters.tag.trim()}</StatusBadge> : null}
      </div>

      <AnimatePresence initial={false}>
        {filterExpanded ? (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              applyAdvancedFilters();
            }}
          >
            <div className="grid gap-2.5 rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <FilterSelectField
                label="题材"
                value={draft.genreId}
                onChange={(value) => updateDraft({ genreId: value })}
                options={[
                  ["", "全部题材"],
                  ["玄幻", "玄幻"],
                  ["奇幻", "奇幻"],
                  ["武侠", "武侠"],
                  ["仙侠", "仙侠"],
                  ["都市", "都市"],
                  ["现实", "现实"],
                  ["历史", "历史"],
                  ["科幻", "科幻"],
                  ["悬疑", "悬疑"],
                  ["短篇", "短篇"],
                ]}
              />
              <FilterField
                label="状态标签"
                value={draft.tag}
                onChange={(value) => updateDraft({ tag: value })}
                placeholder="连载中、已完结"
              />
              <FilterField
                label="创建人"
                value={draft.owner}
                onChange={(value) => updateDraft({ owner: value })}
                placeholder="作者邮箱或 ID"
              />
              <FilterSelectField
                label="排序"
                value={draft.sort}
                onChange={(value) => updateDraft({ sort: value as DashboardFilters["sort"] })}
                options={[
                  ["updated_desc", "最近更新"],
                  ["created_desc", "最新创建"],
                  ["word_desc", "字数最多"],
                  ["progress_desc", "进度最高"],
                  ["title_asc", "标题 A-Z"],
                ]}
              />
              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
                <Button
                  type="submit"
                  tone="primary"
                  icon={Check}
                  disabled={loading || !hasDraftChanges}
                  className="min-h-9 flex-1 rounded-[4px] px-3 xl:flex-none"
                >
                  应用
                </Button>
                <Button
                  type="button"
                  tone="ghost"
                  icon={RotateCcw}
                  onClick={resetFilters}
                  disabled={loading || !hasFilters}
                  className="min-h-9 flex-1 rounded-[4px] px-3 xl:flex-none"
                >
                  重置
                </Button>
              </div>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TypeFilterTabs({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: WorkLibraryTypeFilter) => void;
  value: WorkLibraryTypeFilter;
}) {
  return (
    <div
      aria-label="作品类型"
      className="grid h-9 grid-cols-4 rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-1 sm:flex"
      role="tablist"
    >
      {FILTER_TYPE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[3px] px-2 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/40 sm:px-3",
              active
                ? "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-[var(--theme-shadow-button)]"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const fieldId = `dashboard-filter-${label}`;

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--theme-text-muted)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 120))}
        placeholder={placeholder}
        className="h-9 w-full rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
      />
    </label>
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
  const fieldId = `dashboard-filter-${label}`;

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--theme-text-muted)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {label}
      </span>
      <select
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-medium text-[var(--theme-text-primary)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)]"
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

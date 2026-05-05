"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import {
  Search, BookOpen, PenTool, Download, Trash2,
  Filter, FileText, User as UserIcon, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardFilters, DashboardWork } from "@/lib/dashboard/dashboard-types";
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
    updateFilters,
    user,
  } = dashboard;
  const router = useRouter();

  const works = overview?.works ?? [];
  const totalWorks = overview?.pagination?.total ?? 0;
  const hasFilters = hasActiveFilter(filters);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const page = filters.page;
  const pageCount = Math.ceil(totalWorks / filters.pageSize);

  const handleExportWork = (workId: string, format: string) => {
    window.location.href = `/api/works/${workId}/export?format=${format}`;
  };

  return (
    <section className="mt-8 flex flex-col gap-6">
      {/* 工具栏区 */}
      <div className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              我的作品宇宙
            </h3>
            <span className="rounded-xl bg-blue-50/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-300">
              {totalWorks} 部
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative flex h-12 w-full sm:w-[260px] items-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white/80 shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/20">
              <div className="pl-4 text-zinc-400 group-focus-within:text-blue-500">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => updateFilters({ q: e.target.value })}
                placeholder="搜索标题、标签..."
                className="h-full w-full bg-transparent px-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 outline-none dark:text-white dark:placeholder:text-zinc-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-sm font-bold shadow-sm transition-all active:scale-[0.98]",
                filterExpanded || hasFilters
                  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-500 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                  : "border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              )}
            >
              <Filter className="h-4 w-4" />
              {hasFilters ? "已过滤" : "筛选"}
            </button>

            <button
              onClick={() => router.push("/dashboard/create")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
              <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-zinc-200/50 pt-5 dark:border-zinc-800/50">
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
                    className="h-10 rounded-xl border border-zinc-200/80 bg-white/80 px-4 text-sm font-bold text-zinc-700 shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-300 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  >
                    <option value="updated_desc">最近更新</option>
                    <option value="created_desc">最新创建</option>
                    <option value="words_desc">字数最多</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 作品列表区 */}
      <div className="flex flex-col gap-4">
        {works.length > 0 ? (
          works.map((work) => (
            <WorkCard
              key={work.id}
              canDeleteWork={Boolean(user?.isAdmin || user?.id === work.owner?.id)}
              deleteBusy={deleteBusy}
              onDelete={() => openDeleteDialog(work)}
              onExport={handleExportWork}
              onWrite={(href) => router.push(href)}
              work={work}
            />
          ))
        ) : (
          <EmptyWorksState hasFilters={hasFilters} onCreate={() => router.push("/dashboard/create")} />
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

function WorkCard({
  canDeleteWork,
  deleteBusy,
  onDelete,
  onExport,
  onWrite,
  work,
}: {
  canDeleteWork: boolean;
  deleteBusy: boolean;
  onDelete: (work: DashboardWork) => void;
  onExport: (workId: string, format: "markdown") => void;
  onWrite: (href: string) => void;
  work: DashboardWork;
}) {
  const tone = getEditorialTone(work.id + ":" + work.title);
  const chapterHref = "/dashboard/novel/" + work.id + "/chapter/" + Math.max(1, work.chapter.index);
  const progressParams = getProgressCopy(work);
  const chapterLine = getChapterLine(work);
  const wordStat = formatWordStat(work.wordCount);
  const ownerLine = work.owner?.name || work.owner?.email;

  const progressPercent = progressParams.hasTarget
    ? Number(progressParams.percent)
    : work.completionPercent;
  const progressDisplay = progressParams.hasTarget
    ? progressParams.value
    : Math.round(progressPercent) + "%";

  return (
    <article className="group relative flex flex-col gap-6 overflow-hidden rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10 dark:hover:bg-zinc-900/80 dark:hover:shadow-black/30 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-start lg:items-center">
        {/* 图标与标题 */}
        <div className="flex min-w-0 flex-1 items-start gap-6">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] text-3xl font-black text-white shadow-lg"
            style={{ backgroundImage: tone.coverGradient }}
          >
            {getTitleInitial(work.title)}
          </div>

          <div className="min-w-0 pt-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300">
                {work.tag || "小说"}
              </span>
              <span className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300">
                {work.genreLabel || "未分类"}
              </span>
            </div>
            <Link
              href={"/dashboard/novel/" + work.id}
              className="mb-2 block truncate text-2xl font-black tracking-tight text-zinc-950 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400 sm:text-3xl"
            >
              {work.title}
            </Link>
            <p className="flex items-center gap-2 text-sm font-bold text-zinc-500 dark:text-zinc-400">
              <BookOpen className="h-4 w-4" />
              <span className="truncate">{chapterLine}</span>
            </p>
            {ownerLine && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{ownerLine}</span>
              </p>
            )}
          </div>
        </div>

        {/* 数据区 */}
        <div className="grid grid-cols-4 gap-6 sm:pl-[104px] lg:ml-8 lg:w-[440px] lg:pl-0">
          <TableMetric label="字数" value={wordStat.value + wordStat.unit} />
          <TableMetric label="章节" value={String(work.chapterCount)} />
          <TableMetric label="更新" value={formatRelativeTime(work.updatedAt)} />
          <ProgressMetric display={progressDisplay} label="进度" value={progressPercent} />
        </div>
      </div>

      {/* 操作栏 */}
      <div className="relative mt-2 flex shrink-0 items-center gap-3 sm:pl-[104px] lg:ml-6 lg:mt-0 lg:pl-0">
        <button
          onClick={() => onWrite(chapterHref)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <PenTool className="h-4 w-4" />
          <span className="hidden sm:inline">写作</span>
        </button>
        <button
          onClick={() => onExport(work.id, "markdown")}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-zinc-300 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
          aria-label="导出"
          title="导出"
        >
          <Download className="h-5 w-5" />
        </button>
        {canDeleteWork && (
          <button
            disabled={deleteBusy}
            onClick={() => onDelete(work)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-200/60 bg-red-50 text-red-600 shadow-sm transition-all hover:bg-red-100 hover:text-red-700 hover:ring-1 hover:ring-red-300 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300 dark:hover:ring-red-500/30"
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
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1.5 truncate text-xl font-black tracking-tight text-zinc-950 dark:text-white">{value}</div>
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
        <span className="text-blue-600 dark:text-blue-400">{display}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 shadow-inner dark:bg-zinc-800">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out dark:bg-blue-400" style={{ width: value + "%" }} />
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
      <div className="flex h-12 w-full items-center rounded-xl border border-zinc-200/80 bg-white/80 px-4 shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/20">
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
        className="h-12 w-full appearance-none rounded-xl border border-zinc-200/80 bg-white/80 px-4 text-sm font-bold text-zinc-900 shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
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
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-white/60 bg-white/70 px-6 py-4 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10">
      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        共 <span className="font-black text-zinc-950 dark:text-white">{total}</span> 部作品，第 <span className="font-black text-zinc-950 dark:text-white">{page} / {safePageCount}</span> 页
      </p>
      <div className="flex gap-3">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-zinc-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
        >
          上一页
        </button>
        <button
          disabled={page >= safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, page + 1))}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-zinc-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function EmptyWorksState({ hasFilters, onCreate }: { hasFilters: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-300/80 bg-zinc-50/50 p-10 text-center shadow-inner dark:border-zinc-700/80 dark:bg-zinc-900/50">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-zinc-100/80 text-zinc-400 shadow-inner ring-1 ring-zinc-200/50 dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-zinc-700/50">
        <FileText className="h-8 w-8" aria-hidden />
      </div>
      <h3 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
        {hasFilters ? "没有匹配的作品" : "这里还空空如也"}
      </h3>
      <p className="mt-3 max-w-md text-sm font-bold leading-relaxed text-zinc-500 dark:text-zinc-400">
        {hasFilters
          ? "尝试放宽筛选条件，或者换一个关键词再搜索。"
          : "开启你的第一部作品，工作台会逐步形成你的创作总览。"}
      </p>
      {!hasFilters && (
        <button
          onClick={onCreate}
          className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          <Plus className="h-5 w-5" />
          新建作品
        </button>
      )}
    </div>
  );
}

function hasActiveFilter(filters: DashboardFilters) {
  return Boolean(filters.q.trim() || filters.genreId.trim() || filters.tag.trim() || filters.owner.trim());
}

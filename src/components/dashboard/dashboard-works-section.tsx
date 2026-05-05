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
      <div className="flex flex-col gap-4 rounded-[32px] bg-white/60 p-6 shadow-sm ring-1 ring-zinc-900/5 dark:bg-white/5 dark:ring-white/10 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              我的作品宇宙
            </h3>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              {totalWorks} 部
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="group relative flex h-12 w-full sm:w-[260px] items-center overflow-hidden rounded-full bg-white dark:bg-black/40 ring-1 ring-zinc-200 dark:ring-white/10 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <div className="pl-4 text-zinc-400 group-focus-within:text-blue-500">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => updateFilters({ q: e.target.value })}
                placeholder="搜索标题、标签..."
                className="h-full w-full bg-transparent px-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className={cn(
                "flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all ring-1",
                filterExpanded || hasFilters
                  ? "bg-blue-500 text-white ring-blue-500 dark:bg-blue-600"
                  : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/10"
              )}
            >
              <Filter className="h-4 w-4" />
              {hasFilters ? "已过滤" : "筛选"}
            </button>

            <button
              onClick={() => router.push("/dashboard/create")}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-white dark:text-zinc-900"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
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
              <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-zinc-200 dark:border-white/10">
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
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">排序</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilters({ sort: e.target.value as DashboardFilters["sort"] })}
                    className="h-10 rounded-full border-none bg-zinc-100 px-4 py-0 text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/10 dark:text-zinc-300"
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
    <article className="group relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-zinc-900/5 transition-all hover:shadow-xl dark:bg-[#1a1a1a] dark:ring-white/10 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      <div className="relative flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start lg:items-center">
        {/* 图标与标题 */}
        <div className="flex min-w-0 flex-1 items-start gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-md"
            style={{ backgroundImage: tone.coverGradient }}
          >
            {getTitleInitial(work.title)}
          </div>
          
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-black text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                {work.tag || "小说"}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-black text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                {work.genreLabel || "未分类"}
              </span>
            </div>
            <Link
              href={"/dashboard/novel/" + work.id}
              className="mb-1 block truncate text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
            >
              {work.title}
            </Link>
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <BookOpen className="h-4 w-4" />
              <span className="truncate">{chapterLine}</span>
            </p>
            {ownerLine && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{ownerLine}</span>
              </p>
            )}
          </div>
        </div>

        {/* 数据区 */}
        <div className="grid grid-cols-3 gap-6 sm:pl-[84px] lg:pl-0 lg:ml-8 lg:w-[400px]">
          <TableMetric label="字数" value={wordStat.value + wordStat.unit} />
          <TableMetric label="章节" value={String(work.chapterCount)} />
          <TableMetric label="更新" value={formatRelativeTime(work.updatedAt)} />
          <ProgressMetric display={progressDisplay} label="进度" value={progressPercent} />
        </div>
      </div>

      {/* 操作栏 */}
      <div className="relative flex shrink-0 items-center gap-3 sm:pl-[84px] lg:pl-0 lg:ml-6">
        <button
          onClick={() => onWrite(chapterHref)}
          className="flex h-12 items-center justify-center rounded-full bg-zinc-100 px-6 font-bold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <PenTool className="mr-2 h-4 w-4" />
          写作
        </button>
        <button
          onClick={() => onExport(work.id, "markdown")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          aria-label="导出"
          title="导出"
        >
          <Download className="h-5 w-5" />
        </button>
        {canDeleteWork && (
          <button
            disabled={deleteBusy}
            onClick={() => onDelete(work)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-500/10 dark:hover:bg-red-500/20"
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
      <div className="text-xs font-black tracking-widest text-zinc-400 uppercase">{label}</div>
      <div className="mt-1.5 truncate text-lg font-black text-zinc-900 dark:text-white">{value}</div>
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
    <div className="col-span-3 min-w-0 sm:col-span-3">
      <div className="mb-2 flex items-center justify-between text-xs font-black tracking-widest uppercase">
        <span className="text-zinc-400">{label}</span>
        <span className="text-blue-500">{display}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-blue-500 transition-[width] duration-1000 ease-out" style={{ width: value + "%" }} />
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
    <label className="block flex-1 min-w-[200px]">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <div className="flex h-11 w-full items-center rounded-2xl bg-zinc-50 px-3 ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-blue-500 dark:bg-black/20 dark:ring-white/10">
        {icon && <div className="mr-2">{icon}</div>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 120))}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
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
    <label className="block flex-1 min-w-[200px]">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl bg-zinc-50 px-4 text-sm font-bold text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black/20 dark:text-white dark:ring-white/10"
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
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/40 px-6 py-4 backdrop-blur-md ring-1 ring-zinc-900/5 dark:bg-white/5 dark:ring-white/10">
      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        共 <span className="text-zinc-900 dark:text-white">{total}</span> 部作品，第 {page} / {safePageCount} 页
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/20"
        >
          上一页
        </button>
        <button
          disabled={page >= safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, page + 1))}
          className="flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/20"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function EmptyWorksState({ hasFilters, onCreate }: { hasFilters: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-300 bg-white/40 p-10 text-center backdrop-blur-md dark:border-zinc-800 dark:bg-white/5">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-6">
        <FileText className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
      </div>
      <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
        {hasFilters ? "没有匹配的作品" : "这里还空空如也"}
      </h3>
      <p className="mt-3 max-w-md text-base font-medium text-zinc-500 dark:text-zinc-400">
        {hasFilters
          ? "尝试放宽筛选条件，或者换一个关键词再搜索。"
          : "开启你的第一部作品，工作台会逐步形成你的创作总览。"}
      </p>
      {!hasFilters && (
        <button
          onClick={onCreate}
          className="mt-8 flex h-12 items-center justify-center rounded-full bg-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" />
          新建作品
        </button>
      )}
    </div>
  );
}

function hasActiveFilter(filters: DashboardFilters) {
  return Boolean(filters.q.trim() || filters.genreId.trim() || filters.tag.trim() || filters.owner.trim());
}

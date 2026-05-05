"use client";

import { Button, Card, Chip, Input, ProgressBar } from "@heroui/react";
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
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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

const SORT_OPTIONS: Array<[DashboardSortKey, string]> = [
  ["updated_desc", "最近更新"],
  ["updated_asc", "最早更新"],
  ["created_desc", "最新创建"],
  ["created_asc", "最早创建"],
  ["word_desc", "字数从高到低"],
  ["word_asc", "字数从低到高"],
  ["progress_desc", "进度从高到低"],
  ["progress_asc", "进度从低到高"],
  ["title_asc", "标题 A-Z"],
  ["title_desc", "标题 Z-A"],
];

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

  const router = useRouter();
  const works = useMemo(() => overview?.works ?? [], [overview?.works]);
  const pagination = overview?.pagination;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedWorks = useMemo(
    () => works.filter((work) => selectedIds.includes(work.id)),
    [selectedIds, works],
  );

  const allVisibleSelected = works.length > 0 && works.every((work) => selectedIds.includes(work.id));
  const totalWorks = pagination?.total ?? works.length;

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

  function exportWork(id: string, format: "markdown" | "txt" = "markdown") {
    window.open(
      `/api/works/${encodeURIComponent(id)}/export?format=${format}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function exportSelected(format: "markdown" | "txt" = "txt") {
    selectedWorks.forEach((work) => exportWork(work.id, format));
  }

  return (
    <section className="mt-0">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[20px] font-black leading-tight tracking-tight text-stone-950 dark:text-stone-50">
              {user?.isAdmin ? "全部用户作品" : "我的作品"}
            </h2>
            {overviewLoading ? (
              <Chip size="sm" variant="soft" color="default" className="gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                同步中
              </Chip>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] font-medium text-stone-500 dark:text-stone-400">
            共 {totalWorks} 部作品，默认按最近更新排序。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="md"
            variant="outline"
            onPress={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            className="h-9 rounded-xl border-stone-200 bg-white px-3.5 font-bold text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200"
          >
            <SlidersHorizontal className="h-4 w-4" />
            筛选
            <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>

          <Button
            size="md"
            variant="primary"
            onPress={() => router.push("/dashboard/create")}
            className="h-9 rounded-xl bg-stone-950 px-3.5 font-black text-white shadow-sm dark:bg-stone-50 dark:text-stone-950"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </Button>
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
        <Card className="mb-4 rounded-2xl border border-red-200 bg-red-50 shadow-none dark:border-red-500/25 dark:bg-red-500/10">
          <Card.Content className="px-4 py-3 text-sm font-bold text-red-700 dark:text-red-200">
            {overviewError}
          </Card.Content>
        </Card>
      ) : null}

      {works.length ? (
        <>
          <Card className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_30px_90px_-64px_rgba(28,25,23,0.35)] dark:border-white/10 dark:bg-[#191715] dark:shadow-[0_30px_90px_-64px_rgba(0,0,0,0.95)]">
            <Card.Content className="p-0">
              <div className="flex flex-col gap-2 border-b border-stone-200 bg-stone-50/80 px-3.5 py-2 text-[13px] font-bold text-stone-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400 sm:flex-row sm:items-center sm:justify-between xl:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span>共 {totalWorks} 部</span>
                  {selectedWorks.length ? (
                    <Chip size="sm" variant="soft" color="success">
                      已选 {selectedWorks.length}
                    </Chip>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={toggleAllVisible}
                    className="rounded-xl font-bold text-stone-600 dark:text-stone-300"
                  >
                    {allVisibleSelected ? "取消本页" : "选择本页"}
                  </Button>

                  {selectedWorks.length ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => exportSelected("txt")}
                      className="rounded-xl bg-white font-black text-stone-800 shadow-sm dark:bg-white/[0.07] dark:text-stone-100"
                    >
                      <Download className="h-4 w-4" />
                      批量导出
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-white/10">
                {works.map((work) => (
                  <WorkRow
                    key={work.id}
                    work={work}
                    isSelected={selectedIds.includes(work.id)}
                    onToggleSelected={toggleSelected}
                    onDelete={openDeleteDialog}
                    onExport={exportWork}
                    onWrite={(href) => router.push(href)}
                    deleteBusy={deleteBusy}
                    userId={user?.id}
                    userIsAdmin={Boolean(user?.isAdmin)}
                  />
                ))}
              </div>
            </Card.Content>
          </Card>

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
        <EmptyWorksState hasFilters={hasActiveFilter(filters)} onCreate={() => router.push("/dashboard/create")} />
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
    <Card className="mb-3 rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#191715]">
      <Card.Content className="p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterField
            label="关键词"
            value={filters.q}
            placeholder="标题 / 章节 / 标签"
            icon={<Search className="h-4 w-4 text-stone-400" />}
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
              icon={<UserRound className="h-4 w-4 text-stone-400" />}
              onChange={(owner) => onUpdate({ owner, page: 1 })}
            />
          ) : (
            <FilterSelectField
              label="排序"
              value={filters.sort}
              options={SORT_OPTIONS}
              onChange={(sort) => onUpdate({ sort: sort as DashboardSortKey, page: 1 })}
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          {isAdmin ? (
            <FilterSelectField
              label="排序"
              value={filters.sort}
              options={SORT_OPTIONS}
              onChange={(sort) => onUpdate({ sort: sort as DashboardSortKey, page: 1 })}
            />
          ) : (
            <div />
          )}

          <Button
            size="md"
            variant="secondary"
            onPress={onClear}
            className="h-9 rounded-xl bg-stone-100 px-3.5 font-bold text-stone-700 dark:bg-white/[0.07] dark:text-stone-100"
          >
            清空筛选
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}

function WorkRow({
  deleteBusy,
  isSelected,
  onDelete,
  onExport,
  onToggleSelected,
  onWrite,
  userId,
  userIsAdmin,
  work,
}: {
  deleteBusy: boolean;
  isSelected: boolean;
  onDelete: (work: DashboardWork) => void;
  onExport: (id: string, format?: "markdown" | "txt") => void;
  onToggleSelected: (id: string) => void;
  onWrite: (href: string) => void;
  userId?: string;
  userIsAdmin: boolean;
  work: DashboardWork;
}) {
  const workHref = `/dashboard/novel/${work.id}`;
  const chapterHref = `/dashboard/novel/${work.id}/chapter/${Math.max(1, work.chapter.index)}`;
  const wordStat = formatWordStat(work.wordCount);
  const canDeleteWork = Boolean(userIsAdmin || work.owner.id === userId);
  const progress = getProgressCopy(work);
  const tone = getEditorialTone(`${work.id}:${work.title}`);
  const genreOrTag = work.genreLabel || work.tag || "未分类";
  const progressValue = progress.hasTarget ? progress.percent : work.completionPercent;
  const progressPercent = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
  const chapterLine = getChapterLine(work);
  const ownerLine = userIsAdmin ? `ID ${work.owner.code} · ${work.owner.email}` : null;
  const progressDisplay = progress.hasTarget ? progress.value : `${progressPercent}%`;

  return (
    <article className="px-3.5 py-2.5 transition-colors hover:bg-stone-50/80 dark:hover:bg-white/[0.04] xl:px-4">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_328px_258px] lg:items-center xl:grid-cols-[minmax(0,1fr)_374px_276px] 2xl:grid-cols-[minmax(0,1fr)_408px_286px]">
        <div className="flex min-w-0 items-start gap-2.5">
          <SelectionButton isSelected={isSelected} label={`选择 ${work.title}`} onPress={() => onToggleSelected(work.id)} />

          <Link
            href={workHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[17px] font-black text-white shadow-sm"
            style={{ backgroundImage: tone.coverGradient }}
            aria-label={`查看 ${work.title}`}
          >
            {getTitleInitial(work.title)}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={workHref} className="min-w-0" title={work.title}>
                <h3 className="truncate text-[15px] font-black tracking-tight text-stone-950 hover:text-emerald-700 dark:text-stone-50 dark:hover:text-emerald-300">
                  《{work.title}》
                </h3>
              </Link>
              <Chip size="sm" variant="soft" color="default" className="max-w-[120px] truncate">
                {genreOrTag}
              </Chip>
            </div>

            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300">
              <BookOpen className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="truncate" title={chapterLine}>
                {chapterLine}
              </span>
            </p>

            {ownerLine ? (
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-stone-400">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={ownerLine}>
                  {ownerLine}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pl-[73px] sm:grid-cols-[58px_48px_68px_minmax(112px,1fr)] sm:pl-[74px] lg:pl-0">
          <TableMetric label="字数" value={`${wordStat.value}${wordStat.unit}`} />
          <TableMetric label="章节" value={String(work.chapterCount)} />
          <TableMetric label="更新" value={formatRelativeTime(work.updatedAt)} />
          <ProgressMetric display={progressDisplay} label="进度" value={progressPercent} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-[73px] sm:pl-[74px] lg:justify-end lg:pl-0">
          <Button
            size="md"
            variant="primary"
            onPress={() => onWrite(chapterHref)}
            className="h-9 rounded-xl bg-stone-950 px-3 font-black text-white shadow-sm dark:bg-stone-50 dark:text-stone-950"
          >
            <PenLine className="h-4 w-4" />
            写作
          </Button>
          <Button
            size="md"
            variant="secondary"
            onPress={() => onExport(work.id, "markdown")}
            className="h-9 rounded-xl bg-white px-3 font-black text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-white/[0.06] dark:text-stone-100 dark:ring-white/10"
            aria-label={`导出 ${work.title}`}
          >
            <Download className="h-4 w-4" />
            导出
          </Button>
          {canDeleteWork ? (
            <Button
              isIconOnly
              size="md"
              variant="danger-soft"
              isDisabled={deleteBusy}
              onPress={() => onDelete(work)}
              className="h-9 w-9 rounded-xl"
              aria-label={`删除 ${work.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SelectionButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className={cn(
        "mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
        isSelected
          ? "border-stone-950 bg-stone-950 text-white dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950"
          : "border-stone-300 bg-white text-transparent hover:border-stone-500 dark:border-white/20 dark:bg-white/[0.04] dark:hover:border-white/40",
      )}
    >
      <Check className="h-3 w-3" />
    </button>
  );
}

function TableMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-black text-stone-950 dark:text-stone-50">{value}</div>
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
    <div className="col-span-3 min-w-0 sm:col-span-1">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-stone-400 dark:text-stone-500">
        <span>{label}</span>
        <span className="text-emerald-700 dark:text-emerald-300">{display}</span>
      </div>
      <ProgressBar aria-label={label} maxValue={100} minValue={0} size="sm" value={value} color="success">
        <ProgressBar.Track className="h-1.5 rounded-full bg-stone-100 dark:bg-white/10">
          <ProgressBar.Fill className="rounded-full bg-emerald-600 dark:bg-emerald-300" />
        </ProgressBar.Track>
      </ProgressBar>
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
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">
        {label}
      </span>
      <span className="relative block">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">{icon}</span> : null}
        <Input
          fullWidth
          variant="secondary"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 120))}
          placeholder={placeholder}
          className={cn(
            "h-9 rounded-xl border-stone-200 bg-stone-50 text-sm font-bold text-stone-900 shadow-none placeholder:text-stone-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-stone-50",
            icon && "pl-9",
          )}
        />
      </span>
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
    <label className="block min-w-[190px]">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-bold text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-stone-50"
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
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] font-bold text-stone-500 dark:text-stone-400">
      <p>
        共 {total} 条，第 {page} / {safePageCount} 页
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          isDisabled={page <= 1}
          onPress={() => onPageChange(Math.max(1, page - 1))}
          className="h-8 rounded-xl bg-white font-bold shadow-sm disabled:opacity-45 dark:bg-white/[0.06]"
        >
          上一页
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={page >= safePageCount}
          onPress={() => onPageChange(Math.min(safePageCount, page + 1))}
          className="h-8 rounded-xl bg-white font-bold shadow-sm disabled:opacity-45 dark:bg-white/[0.06]"
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

function EmptyWorksState({ hasFilters, onCreate }: { hasFilters: boolean; onCreate: () => void }) {
  return (
    <Card className="rounded-3xl border border-dashed border-stone-300 bg-white/80 shadow-sm dark:border-white/15 dark:bg-white/[0.04]">
      <Card.Content className="flex min-h-[210px] flex-col items-center justify-center px-6 py-10 text-center">
        <FileText className="h-9 w-9 text-stone-300 dark:text-stone-600" />
        <h3 className="mt-4 text-base font-black text-stone-950 dark:text-stone-50">
          {hasFilters ? "没有匹配的作品" : "还没有作品"}
        </h3>
        <p className="mt-2 max-w-md text-sm font-medium leading-6 text-stone-500 dark:text-stone-400">
          {hasFilters
            ? "尝试放宽筛选条件，或者换一个关键词再搜索。"
            : "从新建作品开始，工作台会逐步形成你的创作总览。"}
        </p>
        {!hasFilters ? (
          <Button
            size="md"
            variant="primary"
            onPress={onCreate}
            className="mt-5 rounded-xl bg-stone-950 px-4 font-black text-white dark:bg-stone-50 dark:text-stone-950"
          >
            <Plus className="h-4 w-4" />
            新建第一部作品
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function hasActiveFilter(filters: DashboardFilters) {
  return Boolean(filters.q.trim() || filters.genreId.trim() || filters.tag.trim() || filters.owner.trim());
}

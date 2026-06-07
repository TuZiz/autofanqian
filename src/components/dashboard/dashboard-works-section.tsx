"use client";

import Link from "next/link";
import { Library, Plus } from "lucide-react";

import { Button, EmptyState, LoadingSkeleton } from "@/components/design-system";
import { DashboardWorkCard } from "@/components/dashboard/dashboard-work-card";
import type { DashboardFilters } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { getWorkLibraryEmptyCopy } from "@/lib/dashboard/work-library-filter";

import { DashboardWorksFilters } from "./dashboard-works-filters";

type DashboardWorksSectionProps = {
  activeWorkId: string | null;
  dashboard: DashboardClientController;
};

export function DashboardWorksSection({ activeWorkId, dashboard }: DashboardWorksSectionProps) {
  const {
    deleteBusy,
    filters,
    isFilterPending,
    openDeleteDialog,
    overview,
    overviewError,
    overviewLoading,
    updateFilters,
    user,
  } = dashboard;
  const works = overview?.works ?? [];
  const totalWorks = overview?.pagination?.total ?? 0;
  const page = filters.page;
  const pageCount = Math.max(1, Math.ceil(totalWorks / filters.pageSize));

  return (
    <section className="dashboard-library overflow-hidden rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-[var(--theme-shadow-card)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--theme-divider)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-border)]">
            <Library className="h-3 w-3" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-extrabold text-[var(--theme-text-strong)]">
              作品库
            </h2>
            <span className="shrink-0 rounded-[3px] bg-[var(--theme-surface-overlay)] px-2 py-0.5 text-[11px] font-bold text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
              共 {totalWorks} 部
            </span>
            <span className="hidden">
              管理你的所有作品
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-2.5">
        <DashboardWorksFilters
          filters={filters}
          loading={overviewLoading || isFilterPending}
          onChange={updateFilters}
          totalWorks={totalWorks}
        />

        {overviewError ? (
          <div className="rounded-[4px] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--theme-danger-text)]">
            {overviewError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-card-secondary)]">
          <div className="hidden min-w-0 border-b border-[var(--theme-divider)] px-3 py-2 text-[11px] font-bold text-[var(--theme-text-muted)] lg:grid lg:grid-cols-[minmax(200px,1.35fr)_104px_96px_72px_76px_minmax(136px,0.8fr)_176px] lg:items-center">
            <span>作品信息</span>
            <span>类型/标签</span>
            <span>章节/场景</span>
            <span>字数</span>
            <span>更新时间</span>
            <span>进度</span>
            <span className="text-right">操作</span>
          </div>
          {overviewLoading || isFilterPending ? (
            <div aria-label="作品库加载中" aria-live="polite">
              <WorkCardSkeleton />
              <WorkCardSkeleton />
            </div>
          ) : works.length > 0 ? (
            works.map((work) => (
              <DashboardWorkCard
                key={work.id}
                active={work.id === activeWorkId}
                canDeleteWork={Boolean(user?.isAdmin || user?.id === work.owner?.id)}
                deleteBusy={deleteBusy}
                onDelete={() => openDeleteDialog(work)}
                work={work}
              />
            ))
          ) : (
            <EmptyWorksState filters={filters} />
          )}
        </div>

        {pageCount > 1 ? (
          <PaginationBar
            page={page}
            pageCount={pageCount}
            total={totalWorks}
            onPageChange={(nextPage) => updateFilters({ page: nextPage })}
          />
        ) : null}
      </div>
    </section>
  );
}

function WorkCardSkeleton() {
  return (
    <div className="border-b border-[var(--theme-divider)] bg-[var(--theme-surface-solid)] p-3 last:border-b-0">
      <div className="flex gap-3">
        <LoadingSkeleton className="h-12 w-10 shrink-0 rounded-[3px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <LoadingSkeleton className="h-4 w-12" />
            <LoadingSkeleton className="h-4 w-14" />
            <LoadingSkeleton className="h-4 w-10" />
          </div>
          <LoadingSkeleton className="h-4 w-2/3" />
          <LoadingSkeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyWorksState({
  filters,
}: {
  filters: DashboardFilters;
}) {
  const copy = getWorkLibraryEmptyCopy(filters);

  return (
    <EmptyState
      icon={Library}
      title={copy.title}
      description={copy.description}
      action={
        copy.canCreate ? (
          <Link
            href="/dashboard/create"
            className="theme-brand-gradient-bg inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-transparent px-3.5 text-sm font-bold text-white shadow-[var(--theme-shadow-button)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--theme-bg)] active:translate-y-px"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </Link>
        ) : null
      }
    />
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-2.5 backdrop-blur-sm">
      <p className="text-sm font-medium text-[var(--theme-text-muted)]">
        共 <span className="font-extrabold text-[var(--theme-text-strong)]">{total}</span> 部作品，第{" "}
        <span className="font-extrabold text-[var(--theme-text-strong)]">
          {page} / {pageCount}
        </span>{" "}
        页
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          上一页
        </Button>
        <Button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

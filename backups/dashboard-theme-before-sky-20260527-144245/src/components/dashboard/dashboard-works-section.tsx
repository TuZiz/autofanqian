"use client";

import { useRouter } from "next/navigation";
import { Library, Plus } from "lucide-react";
import { useCallback } from "react";

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
  const router = useRouter();
  const works = overview?.works ?? [];
  const totalWorks = overview?.pagination?.total ?? 0;
  const page = filters.page;
  const pageCount = Math.max(1, Math.ceil(totalWorks / filters.pageSize));
  const handleOpen = useCallback((href: string) => router.push(href), [router]);
  const handleCreate = useCallback(() => router.push("/dashboard/create"), [router]);

  return (
    <section className="dashboard-library overflow-hidden rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-[var(--theme-shadow-card)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-[var(--theme-divider)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-border)]">
            <Library className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-[var(--theme-text-strong)]">
              作品库
            </h2>
            <p className="mt-1 text-sm font-medium leading-5 text-[var(--theme-text-secondary)]">
              管理你的所有作品
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
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
          <div className="hidden min-w-0 border-b border-[var(--theme-divider)] px-3 py-2 text-[11px] font-bold text-[var(--theme-text-muted)] lg:grid lg:grid-cols-[minmax(260px,1.35fr)_150px_100px_92px_96px_minmax(150px,0.8fr)_132px] lg:items-center">
            <span>作品信息</span>
            <span>类型/标签</span>
            <span>字数</span>
            <span>场景/章节</span>
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
                onOpen={handleOpen}
                work={work}
              />
            ))
          ) : (
            <EmptyWorksState filters={filters} onCreate={handleCreate} />
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
  onCreate,
}: {
  filters: DashboardFilters;
  onCreate: () => void;
}) {
  const copy = getWorkLibraryEmptyCopy(filters);

  return (
    <EmptyState
      icon={Library}
      title={copy.title}
      description={copy.description}
      action={
        copy.canCreate ? (
          <Button type="button" tone="primary" icon={Plus} onClick={onCreate}>
            新建作品
          </Button>
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

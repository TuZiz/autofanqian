"use client";

import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";

type DashboardDeleteDialogProps = {
  dashboard: DashboardClientController;
};

export function DashboardDeleteDialog({ dashboard }: DashboardDeleteDialogProps) {
  const {
    closeDeleteDialog,
    deleteBusy,
    deleteConfirmInput,
    deleteConfirmed,
    deleteError,
    deleteTarget,
    handleConfirmDelete,
    setDeleteConfirmInput,
  } = dashboard;

  if (!deleteTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={closeDeleteDialog} />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-panel relative z-10 w-full max-w-lg rounded-lg p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="theme-heading text-lg font-semibold">删除《{deleteTarget.title}》？</h3>
            <p className="theme-subheading mt-2 text-sm leading-relaxed">
              此操作无法撤销，将删除作品与其全部章节。请输入{" "}
              <span className="font-bold">删除</span> 以确认删除。
            </p>
          </div>
          <button
            type="button"
            className="theme-button-secondary inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={closeDeleteDialog}
            disabled={deleteBusy}
          >
            关闭
          </button>
        </div>

        <label className="mt-4 block">
          <span className="theme-muted mb-1.5 block text-xs font-semibold">确认文本</span>
          <input
            value={deleteConfirmInput}
            onChange={(event) => setDeleteConfirmInput(event.target.value.slice(0, 24))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && deleteConfirmed) {
                event.preventDefault();
                void handleConfirmDelete();
              }
            }}
            autoFocus
            placeholder="输入 删除"
            className="theme-input w-full rounded-lg px-4 py-3 text-sm font-semibold"
          />
        </label>

        {deleteError ? (
          <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-300/20 dark:text-rose-200">
            {deleteError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="theme-button-secondary inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={closeDeleteDialog}
            disabled={deleteBusy}
          >
            取消
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(244,63,94,0.52)] transition hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_22px_52px_-28px_rgba(244,63,94,0.38)]"
            disabled={!deleteConfirmed || deleteBusy}
            onClick={handleConfirmDelete}
          >
            {deleteBusy ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

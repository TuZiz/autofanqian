"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const open = Boolean(deleteTarget);

  useEffect(() => {
    if (!open) {
      setDeleteConfirmInput("");
    }
  }, [open, setDeleteConfirmInput]);

  if (!open || !deleteTarget) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!deleteBusy ? closeDeleteDialog : undefined}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-xl bg-[var(--theme-surface-solid)] p-8 shadow-xl dark:bg-[var(--theme-surface-solid)]"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            彻底删除《{deleteTarget.title}》？
          </h2>
          
          <div className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <p className="mb-2 text-red-600 dark:text-red-400 font-bold">
              此操作不可逆！
            </p>
            这将会永久删除该作品的所有章节、大纲、人物设定以及与之相关的 AI 记忆和缓存。
            如果您确定要删除，请在下方输入作品标题 <strong className="text-zinc-900 dark:text-white select-all">《{deleteTarget.title}》</strong> 以确认。
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={deleteTarget.title}
              disabled={deleteBusy}
              className="h-14 w-full rounded-2xl border-none bg-zinc-50 px-4 text-base font-bold text-zinc-900 ring-1 ring-[var(--theme-border)] outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:bg-black/20 dark:text-white dark:ring-[var(--theme-border)]"
            />
            {deleteError && (
              <p className="pl-2 text-sm font-bold text-red-500">
                {deleteError}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={deleteBusy}
              onClick={closeDeleteDialog}
              className="flex h-12 items-center justify-center rounded-full bg-zinc-100 px-6 font-bold text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              取 消
            </button>
            <button
              type="button"
              disabled={deleteBusy || !deleteConfirmed}
              onClick={handleConfirmDelete}
              className="flex h-12 items-center justify-center rounded-full bg-red-500 px-8 font-bold text-white shadow-lg shadow-red-500/20 transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:bg-red-600"
            >
              {deleteBusy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  删除中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  确认删除
                </span>
              )}
            </button>
          </div>

          <button
            onClick={closeDeleteDialog}
            className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

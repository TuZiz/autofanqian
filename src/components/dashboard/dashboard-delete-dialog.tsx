"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/design-system";
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
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setDeleteConfirmInput("");
    }
  }, [open, setDeleteConfirmInput]);

  useEffect(() => {
    if (!open || deleteBusy) return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDeleteDialog();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && deleteConfirmed) {
        event.preventDefault();
        void handleConfirmDelete();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDeleteDialog, deleteBusy, deleteConfirmed, handleConfirmDelete, open]);

  if (!open || !deleteTarget) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!deleteBusy ? closeDeleteDialog : undefined}
          className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-5 shadow-[var(--theme-shadow-panel)] sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-2xl">
                彻底删除《{deleteTarget.title}》？
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
                这会永久删除该作品的章节、大纲、人物设定以及相关 AI 记忆。请输入作品标题确认删除。
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-sm font-medium leading-6 text-[var(--theme-danger-text)]">
            此操作不可逆。需要完全匹配标题：
            <strong className="select-all px-1 text-[var(--theme-text-strong)]">《{deleteTarget.title}》</strong>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--theme-text-muted)]" htmlFor="dashboard-delete-confirm">
              删除确认
            </label>
            <input
              ref={inputRef}
              id="dashboard-delete-confirm"
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={deleteTarget.title}
              disabled={deleteBusy}
              aria-invalid={Boolean(deleteError)}
              aria-describedby={deleteError ? "dashboard-delete-error" : undefined}
              className="h-12 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-base font-bold text-[var(--theme-text-strong)] outline-none transition focus:border-[var(--theme-danger-text)] focus:ring-4 focus:ring-[var(--theme-danger-text)]/15 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {deleteError && (
              <p id="dashboard-delete-error" className="pl-1 text-sm font-bold text-[var(--theme-danger-text)]">
                {deleteError}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              tone="secondary"
              disabled={deleteBusy}
              onClick={closeDeleteDialog}
              className="h-11"
            >
              取消
            </Button>
            <Button
              type="button"
              tone="danger"
              disabled={deleteBusy || !deleteConfirmed}
              onClick={handleConfirmDelete}
              className="h-11 min-w-32 bg-[var(--theme-danger-text)] text-white hover:brightness-95"
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteBusy ? "删除中..." : "确认删除"}
            </Button>
          </div>

          <button
            type="button"
            onClick={closeDeleteDialog}
            disabled={deleteBusy}
            aria-label="关闭删除确认"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

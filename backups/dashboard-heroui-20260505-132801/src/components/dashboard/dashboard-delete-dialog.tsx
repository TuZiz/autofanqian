"use client";

import { AlertDialog, Button, Input } from "@heroui/react";
import { TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleteBusy) {
        closeDeleteDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDeleteDialog, deleteBusy]);

  return (
    <AlertDialog
      isOpen={Boolean(deleteTarget)}
      onOpenChange={(open) => {
        if (!open && !deleteBusy) closeDeleteDialog();
      }}
    >
      <AlertDialog.Backdrop
        variant="blur"
        isDismissable={!deleteBusy}
        isKeyboardDismissDisabled={deleteBusy}
        className="bg-stone-950/28 backdrop-blur-md dark:bg-black/60"
      >
        <AlertDialog.Container placement="center" size="md" className="px-4">
          <AlertDialog.Dialog className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fbfaf7] p-0 text-stone-950 shadow-[0_30px_90px_-46px_rgba(28,25,23,0.5)] outline-none dark:border-white/10 dark:bg-[#191715] dark:text-stone-50 dark:shadow-[0_30px_90px_-46px_rgba(0,0,0,0.95)]">
            <AlertDialog.Header className="flex items-start gap-4 border-b border-stone-200 px-5 py-5 dark:border-white/10">
              <AlertDialog.Icon
                status="danger"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-500/12 dark:text-red-200"
              >
                <TriangleAlert className="h-5 w-5" />
              </AlertDialog.Icon>

              <div className="min-w-0 flex-1">
                <AlertDialog.Heading className="truncate text-[22px] font-black leading-tight tracking-tight">
                  删除《{deleteTarget?.title}》？
                </AlertDialog.Heading>
                <p className="mt-2 text-sm font-medium leading-6 text-stone-600 dark:text-stone-300">
                  此操作无法撤销，将删除作品与其全部章节。请输入
                  <span className="mx-1 font-black text-stone-950 dark:text-stone-50">删除</span>
                  以确认。
                </p>
              </div>

              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                isDisabled={deleteBusy}
                onPress={closeDeleteDialog}
                className="rounded-xl text-stone-500 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
                aria-label="关闭删除确认"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDialog.Header>

            <AlertDialog.Body className="px-5 py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-stone-500 dark:text-stone-400">
                  确认文本
                </span>
                <Input
                  fullWidth
                  variant="secondary"
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
                  className="h-12 rounded-2xl border-stone-300 bg-white px-4 text-base font-bold text-stone-950 shadow-none placeholder:text-stone-400 focus:border-red-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-stone-50 dark:placeholder:text-stone-500"
                />
              </label>

              {deleteError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                  {deleteError}
                </div>
              ) : null}
            </AlertDialog.Body>

            <AlertDialog.Footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-white/66 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Button
                size="md"
                variant="secondary"
                onPress={closeDeleteDialog}
                isDisabled={deleteBusy}
                className="h-11 rounded-xl bg-white px-5 font-black text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-white/[0.06] dark:text-stone-100 dark:ring-white/10"
              >
                取消
              </Button>
              <Button
                size="md"
                variant="danger"
                isDisabled={!deleteConfirmed || deleteBusy}
                onPress={handleConfirmDelete}
                className="h-11 rounded-xl px-5 font-black disabled:bg-stone-100 disabled:text-stone-400 dark:disabled:bg-white/[0.06] dark:disabled:text-stone-500"
              >
                {deleteBusy ? "删除中..." : "确认删除"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

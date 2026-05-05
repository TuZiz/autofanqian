"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { X } from "lucide-react";

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
    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteBusy) closeDeleteDialog(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[560px] gap-0 overflow-hidden rounded-none border border-[#1c1917] bg-[#fbfaf7] p-0 text-[#1c1917] shadow-[0_34px_90px_-46px_rgba(28,25,23,0.45)] dark:border-white/70 dark:bg-[#1c1917] dark:text-[#f5f5f4] dark:shadow-[0_34px_90px_-46px_rgba(0,0,0,0.95)] sm:max-w-[560px]"
      >
        <DialogHeader className="gap-3 px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-5">
            <DialogTitle className="min-w-0 text-[22px] font-bold leading-snug text-[#1c1917] dark:text-[#f5f5f4]">
              删除《{deleteTarget?.title}》？
            </DialogTitle>
            <button
              type="button"
              onClick={closeDeleteDialog}
              disabled={deleteBusy}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-[#1c1917] transition hover:border-[#d8d3c9] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#f5f5f4] dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
              aria-label="关闭删除确认"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <DialogDescription className="max-w-[480px] text-[16px] leading-7 text-[#4f4944] dark:text-[#d6d3d1]">
            此操作无法撤销，将删除作品与其全部章节。请输入{" "}
            <span className="font-bold text-[#1c1917] dark:text-[#f5f5f4]">删除</span> 以确认。
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Label className="mb-3 block text-[15px] font-bold text-[#6f6962] dark:text-[#a8a29e]">
            确认文本
          </Label>
          <Input
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
            className="h-12 rounded-none border-[#1c1917] bg-white px-4 text-[16px] font-medium text-[#1c1917] shadow-none placeholder:text-[#9b948d] focus-visible:border-[#047857] focus-visible:ring-2 focus-visible:ring-[#10a37f]/20 dark:border-white/40 dark:bg-[#151311] dark:text-[#f5f5f4] dark:placeholder:text-[#78716c]"
          />

          {deleteError ? (
            <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
              {deleteError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#1c1917] bg-[#efede8] px-6 py-4 dark:border-white/70 dark:bg-[#151311]">
          <Button
            variant="outline"
            onClick={closeDeleteDialog}
            disabled={deleteBusy}
            className="h-11 rounded-none border-[#1c1917] bg-white px-5 text-[16px] font-bold text-[#1c1917] shadow-none hover:bg-[#f7f4ef] dark:border-white/40 dark:bg-transparent dark:text-[#f5f5f4] dark:hover:bg-white/[0.08]"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={!deleteConfirmed || deleteBusy}
            onClick={handleConfirmDelete}
            className="h-11 rounded-none px-5 text-[16px] font-bold disabled:bg-transparent disabled:text-[#9b948d] enabled:bg-[#b91c1c] enabled:text-white enabled:hover:bg-[#991b1b]"
          >
            {deleteBusy ? "删除中..." : "确认删除"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

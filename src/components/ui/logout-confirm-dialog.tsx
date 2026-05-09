"use client";

import {
  ModalRoot,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
} from "@heroui/react";
import { LogOut } from "lucide-react";

type LogoutConfirmDialogProps = {
  busy?: boolean;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function LogoutConfirmDialog({
  busy = false,
  open,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <ModalRoot isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !busy) onCancel(); }}>
      <ModalContainer>
        <ModalBackdrop className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm" />
        <ModalDialog
          className="relative z-10 w-full max-w-md rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-5 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[var(--theme-text-strong)]">
                确认退出账号？
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--theme-text-secondary)]">
                退出后会返回登录页，当前账号会话将结束。确定要继续吗？
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--theme-border)] px-4 text-sm font-bold text-[var(--theme-text-secondary)] transition hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={onCancel}
              disabled={busy}
            >
              取消
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              {busy ? "退出中..." : "确认退出"}
            </button>
          </div>
        </ModalDialog>
      </ModalContainer>
    </ModalRoot>
  );
}

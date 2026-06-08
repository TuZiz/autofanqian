"use client";

import { LogOut } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

type LogoutConfirmDialogProps = {
  busy?: boolean;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  square?: boolean;
};

export function LogoutConfirmDialog({
  busy = false,
  open,
  onCancel,
  onConfirm,
  square = false,
}: LogoutConfirmDialogProps) {
  useEffect(() => {
    if (!open || busy) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="取消退出登录"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={!busy ? onCancel : undefined}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className={cn(
          "relative z-10 w-full max-w-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-5 shadow-xl",
          square ? "rounded-none" : "rounded-xl",
        )}
      >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]",
                square ? "rounded-none" : "rounded-2xl",
              )}
            >
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="logout-confirm-title" className="text-lg font-bold text-[var(--theme-text-strong)]">
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
              className={cn(
                "inline-flex h-9 items-center justify-center border border-[var(--theme-border)] px-4 text-sm font-bold text-[var(--theme-text-secondary)] transition hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-70",
                square ? "rounded-none" : "rounded-lg",
              )}
              onClick={onCancel}
              disabled={busy}
            >
              取消
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-9 items-center justify-center bg-[var(--theme-danger-text)] px-4 text-sm font-bold text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                square ? "rounded-none" : "rounded-lg",
              )}
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              {busy ? "退出中..." : "确认退出"}
            </button>
          </div>
      </section>
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthToastProps = {
  message: string;
  success: boolean;
};

export function AuthToast({ message, success }: AuthToastProps) {
  const Icon = success ? CheckCircle2 : AlertTriangle;
  const title = success ? "操作成功" : "请检查输入";

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-success={success}
      className={cn(
        "fixed left-1/2 top-5 z-50 flex w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-300",
        success
          ? "border-[var(--theme-success-border)] bg-[var(--theme-surface-strong)] text-[var(--theme-success-text)]"
          : "border-[var(--theme-danger-border)] bg-[var(--theme-surface-strong)] text-[var(--theme-danger-text)]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
          success
            ? "bg-[var(--theme-success-soft)] ring-[var(--theme-success-border)]"
            : "bg-[var(--theme-danger-soft)] ring-[var(--theme-danger-border)]"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black leading-5 text-[var(--theme-text-strong)]">
          {title}
        </span>
        <span className="mt-0.5 block text-sm font-bold leading-5">
          {message}
        </span>
      </span>
    </div>
  );
}

import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

export const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-5 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white";

export const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400";

export const textareaClass =
  "w-full resize-none rounded-2xl border border-[var(--theme-border)] bg-white/80 px-4 py-3 text-sm font-bold leading-relaxed text-zinc-700 outline-none shadow-sm transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

export const compactTextareaClass =
  "w-full resize-none rounded-xl border border-[var(--theme-border)] bg-white/80 px-3 py-2.5 text-sm font-bold leading-relaxed text-zinc-700 outline-none shadow-sm transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20";

function stopIfDisabled(event: MouseEvent, disabled: boolean, onCancel: () => void) {
  if (disabled) return;
  onCancel();
}

export function DialogFrame({
  ariaLabelledBy,
  children,
  closeDisabled = false,
  maxWidth = "max-w-2xl",
  onCancel,
}: {
  ariaLabelledBy: string;
  children: ReactNode;
  closeDisabled?: boolean;
  maxWidth?: string;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭弹窗"
        disabled={closeDisabled}
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity disabled:cursor-wait"
        onClick={(event) => stopIfDisabled(event, closeDisabled, onCancel)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "relative z-10 flex max-h-[88vh] w-full animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface-solid)]",
          maxWidth,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  description,
  icon,
  kicker,
  onCancel,
  title,
  titleId,
  closeDisabled = false,
}: {
  closeDisabled?: boolean;
  description: string;
  icon: ReactNode;
  kicker: string;
  onCancel: () => void;
  title: string;
  titleId: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-white/50 px-6 py-5 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {kicker}
          </p>
          <h3
            id={titleId}
            className="mt-1 truncate text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
          >
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="关闭"
        disabled={closeDisabled}
        onClick={onCancel}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DisabledHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 px-5 py-4 text-sm font-bold leading-relaxed text-amber-700 shadow-inner dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
      {children}
    </div>
  );
}

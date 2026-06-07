import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

export const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-5 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export const primaryButtonClass =
  "theme-brand-gradient-bg inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg hover:shadow-[var(--theme-brand-500)]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

export const textareaClass =
  "w-full resize-none rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-3 text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)] outline-none shadow-sm transition-all placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-border)] disabled:cursor-wait disabled:opacity-70/80";

export const compactTextareaClass =
  "w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-2.5 text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)] outline-none shadow-sm transition-all placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-border)] disabled:cursor-wait disabled:opacity-70/80";

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
          "relative z-10 flex max-h-[88vh] w-full animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl",
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
    <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-5">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
            {kicker}
          </p>
          <h3
            id={titleId}
            className="mt-1 truncate text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]"
          >
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--theme-text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="关闭"
        disabled={closeDisabled}
        onClick={onCancel}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DisabledHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-warning-border)]/60 bg-[var(--theme-warning-soft)]/80 px-5 py-4 text-sm font-bold leading-relaxed text-[var(--theme-warning-text)] shadow-inner">
      {children}
    </div>
  );
}

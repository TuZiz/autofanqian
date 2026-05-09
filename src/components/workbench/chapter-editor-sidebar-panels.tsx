"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, ChevronDown, Maximize2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SidebarSectionKey = "target" | "summary" | "outline" | "details";

export function CollapsiblePanel({
  action,
  children,
  expanded,
  icon: Icon,
  onToggle,
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  expanded: boolean;
  icon: LucideIcon;
  onToggle: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-colors group-hover:text-[var(--theme-text-secondary)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[var(--theme-text-strong)]">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-[var(--theme-text-muted)]">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {expanded ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function MetaTextareaCard({
  actionIcon: ActionIcon,
  actionError,
  actionLabel,
  disabled,
  expanded,
  icon: Icon,
  onAction,
  onExpand,
  onToggle,
  onValueChange,
  placeholder,
  rows,
  subtitle,
  title,
  value,
}: {
  actionIcon: LucideIcon;
  actionError?: string;
  actionLabel: string;
  disabled: boolean;
  expanded: boolean;
  icon: LucideIcon;
  onAction: () => void;
  onExpand: () => void;
  onToggle: () => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  rows: number;
  subtitle?: string;
  title: string;
  value: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-colors group-hover:text-[var(--theme-text-secondary)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[var(--theme-text-strong)]">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-[var(--theme-text-muted)]">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            title={actionError || undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              actionError
                ? "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)]"
                : "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] hover:bg-[var(--theme-brand-subtle)]",
            )}
          >
            {actionError ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <ActionIcon className="h-3.5 w-3.5" />
            )}
            <span className="max-w-[5.5rem] truncate">{actionError || actionLabel}</span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--theme-surface-overlay)] px-2 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)]"
            title="打开编辑窗口"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            编辑
          </button>
        </div>
      </div>
      {expanded ? (
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          className="mt-3 w-full resize-y rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-3 text-sm leading-7 text-[var(--theme-text-primary)] outline-none ring-1 ring-[var(--theme-border)] transition focus:bg-[var(--theme-surface-solid)] focus:ring-[var(--theme-brand-border)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      ) : null}
    </section>
  );
}

export function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

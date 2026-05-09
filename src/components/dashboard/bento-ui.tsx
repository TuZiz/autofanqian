"use client";

import type { ComponentType, ReactNode } from "react";

import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export function IconBox({
  icon: Icon,
  className,
  iconClassName,
}: {
  icon: IconComponent;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] shadow-inner ring-1 ring-[var(--theme-brand-border)]",
        className,
      )}
    >
      <Icon aria-hidden className={cn("h-5 w-5", iconClassName)} />
    </div>
  );
}

export function BentoCard({
  children,
  className,
  noise = true,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  noise?: boolean;
  hover?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-6 shadow-sm ring-1 ring-[var(--theme-border)] backdrop-blur-xl transition-all duration-300 ease-out",
        hover && "hover:-translate-y-0.5 hover:shadow-lg hover:bg-[var(--theme-surface-hover)]",
        className,
      )}
    >
      {noise ? (
        <div className="pointer-events-none absolute inset-0 app-noise opacity-[0.03] mix-blend-overlay" />
      ) : null}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "muted" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    brand:
      "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] border border-[var(--theme-brand-border)] shadow-sm",
    muted:
      "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)] shadow-sm",
    success:
      "bg-[var(--theme-success-soft)] text-[var(--theme-success-text)] border border-[var(--theme-success-border)] shadow-sm",
    warning:
      "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] border border-[var(--theme-warning-border)] shadow-sm",
    danger:
      "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] border border-[var(--theme-danger-border)] shadow-sm",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest",
        toneClass,
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function SectionHeader({
  icon,
  kicker,
  title,
  description,
  action,
  className,
}: {
  icon?: IconComponent;
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-6", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {icon ? <IconBox icon={icon} /> : null}
        <div className="min-w-0">
          {kicker ? (
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
              {kicker}
            </div>
          ) : null}
          <h2 className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-[var(--theme-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title = "暂无数据",
  description = "当有新内容时，它们会以精致卡片的形式显示在这里。",
  icon = Inbox,
  className,
}: {
  title?: string;
  description?: string;
  icon?: IconComponent;
  className?: string;
}) {
  const Icon = icon;

  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-10 text-center shadow-inner",
        className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] shadow-inner ring-1 ring-[var(--theme-border)]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
        {title}
      </p>
      <p className="mt-3 max-w-sm text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)]">
        {description}
      </p>
    </div>
  );
}

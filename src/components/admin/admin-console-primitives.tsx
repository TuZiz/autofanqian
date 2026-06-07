"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/design-system";
import { cn } from "@/lib/utils";

type AdminTone = "ai" | "brand" | "danger" | "neutral" | "success" | "warning";

const toneStyles: Record<
  AdminTone,
  {
    badgeTone: "ai" | "danger" | "neutral" | "success" | "warning";
    accentClassName: string;
    iconClassName: string;
    panelClassName: string;
  }
> = {
  ai: {
    badgeTone: "ai",
    accentClassName: "bg-[var(--theme-ai-500)]",
    iconClassName:
      "border-[var(--theme-ai-border)] bg-[var(--theme-ai-soft)] text-[var(--theme-ai-text)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
  brand: {
    badgeTone: "ai",
    accentClassName: "bg-[var(--theme-brand-500)]",
    iconClassName:
      "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
  danger: {
    badgeTone: "danger",
    accentClassName: "bg-[var(--theme-danger)]",
    iconClassName:
      "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
  neutral: {
    badgeTone: "neutral",
    accentClassName: "bg-[var(--theme-border-strong)]",
    iconClassName:
      "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
  success: {
    badgeTone: "success",
    accentClassName: "bg-[var(--theme-success)]",
    iconClassName:
      "border-[var(--theme-success-border)] bg-[var(--theme-success-soft)] text-[var(--theme-success-text)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
  warning: {
    badgeTone: "warning",
    accentClassName: "bg-[var(--theme-warning)]",
    iconClassName:
      "border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]",
    panelClassName: "bg-[var(--theme-surface-solid)]",
  },
};

export function AdminStatusPill({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: AdminTone;
}) {
  return (
    <StatusBadge
      className={cn("rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.04em]", className)}
      tone={toneStyles[tone].badgeTone}
    >
      {children}
    </StatusBadge>
  );
}

type AdminStatCardProps = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone?: AdminTone;
  trend?: string;
  value: string;
};

export function AdminStatCard({
  description,
  icon: Icon,
  label,
  tone = "brand",
  trend,
  value,
}: AdminStatCardProps) {
  const toneStyle = toneStyles[tone];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-[var(--theme-shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-panel)]",
        toneStyle.panelClassName,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[3px]", toneStyle.accentClassName)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
            {label}
          </p>
          <p className="mt-1.5 text-[28px] font-black tracking-[-0.03em] text-[var(--theme-text-strong)] sm:text-[32px]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border shadow-[var(--theme-shadow-button)] transition-transform duration-200 group-hover:scale-105",
            toneStyle.iconClassName,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="relative mt-3 line-clamp-2 text-[12px] font-semibold leading-5 text-[var(--theme-text-secondary)]">
        {description}
      </p>
      {trend ? (
        <div className="relative mt-3">
          <AdminStatusPill tone={tone}>{trend}</AdminStatusPill>
        </div>
      ) : null}
    </article>
  );
}

type AdminModuleCardProps = {
  description: string;
  detail?: string;
  href: string;
  icon: LucideIcon;
  status?: string;
  title: string;
  tone?: AdminTone;
};

export function AdminModuleCard({
  description,
  detail,
  href,
  icon: Icon,
  status,
  title,
  tone = "brand",
}: AdminModuleCardProps) {
  const toneStyle = toneStyles[tone];

  return (
    <Link
      href={href}
      className="group relative flex min-h-[138px] flex-col overflow-hidden rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-[var(--theme-shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-panel)]"
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[3px]", toneStyle.accentClassName)} />
      <div className="relative flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border shadow-[var(--theme-shadow-button)] transition duration-200 group-hover:scale-105",
            toneStyle.iconClassName,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)] transition duration-200 group-hover:translate-x-1 group-hover:text-[var(--theme-brand-text)]" />
      </div>
      <div className="relative mt-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-black text-[var(--theme-text-strong)]">{title}</h3>
          {status ? <AdminStatusPill tone={tone}>{status}</AdminStatusPill> : null}
        </div>
        <p className="mt-2 text-[13px] font-semibold leading-5 text-[var(--theme-text-secondary)]">
          {description}
        </p>
        {detail ? (
          <p className="mt-3 text-[11px] font-bold tracking-[0.01em] text-[var(--theme-text-muted)]">
            {detail}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function AdminEmptyStateCard({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: LucideIcon;
  title: string;
}) {
  return (
    <div className={cn("rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-2.5 shadow-[var(--theme-shadow-card)]", className)}>
      <EmptyState
        action={action}
        description={description}
        icon={icon}
        title={title}
      />
    </div>
  );
}

type RankingMetric = {
  label: string;
  value: string;
};

export function AdminRankingRow({
  metrics,
  rank,
  subtitle,
  title,
}: {
  metrics: RankingMetric[];
  rank: number;
  subtitle?: string;
  title: string;
}) {
  const highlightClassName =
    rank === 1
      ? "border-[#f3d38f] bg-[linear-gradient(180deg,rgba(243,211,143,0.26),rgba(255,255,255,0.94))]"
      : rank === 2
        ? "border-[rgba(148,163,184,0.24)] bg-[linear-gradient(180deg,rgba(203,213,225,0.16),rgba(255,255,255,0.95))]"
        : rank === 3
          ? "border-[rgba(191,173,143,0.28)] bg-[linear-gradient(180deg,rgba(191,173,143,0.14),rgba(255,255,255,0.95))]"
          : "border-[var(--theme-border)] bg-[rgba(255,255,255,0.9)]";

  return (
    <div
      className={cn(
        "grid gap-3 rounded-[16px] border px-3 py-3 transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] lg:grid-cols-[48px_minmax(0,1fr)_auto] lg:items-center",
        highlightClassName,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-sm font-black text-[var(--theme-text-strong)] shadow-[var(--theme-shadow-button)]">
        #{rank}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-black text-[var(--theme-text-strong)]">{title}</p>
        {subtitle ? (
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-[var(--theme-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {metrics.map((metric) => (
          <span
            key={`${metric.label}-${metric.value}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-[10px] font-bold text-[var(--theme-text-secondary)]"
          >
            <span className="text-[var(--theme-text-muted)]">{metric.label}</span>
            <span className="text-[var(--theme-text-strong)]">{metric.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

type AdminFormGroupProps = HTMLAttributes<HTMLDivElement> & {
  badge?: ReactNode;
  danger?: boolean;
  description?: string;
  title: string;
};

export function AdminFormGroup({
  badge,
  children,
  className,
  danger = false,
  description,
  title,
  ...props
}: AdminFormGroupProps) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-[18px] border bg-[var(--theme-surface-solid)] p-4 shadow-[var(--theme-shadow-card)]",
        danger
          ? "border-[var(--theme-danger-border)] bg-[linear-gradient(180deg,rgba(239,68,68,0.08),rgba(255,255,255,0.94))]"
          : "border-[var(--theme-border)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[13px] font-black text-[var(--theme-text-strong)]">{title}</h4>
          {description ? (
            <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--theme-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

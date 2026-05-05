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
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/15",
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
        "glass-panel relative overflow-hidden rounded-lg p-5 shadow-sm ring-0 transition-colors duration-200 ease-out",
        hover && "hover:border-stone-300 hover:bg-stone-50/60 dark:hover:border-stone-700 dark:hover:bg-stone-900",
        className,
      )}
    >
      {noise ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle_at_1px_1px,rgba(28,25,23,0.3)_1px,transparent_0)] [background-size:18px_18px] dark:opacity-[0.05]" />
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
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/15",
    muted:
      "bg-stone-100/80 text-stone-600 ring-1 ring-stone-200/60 dark:bg-white/[0.05] dark:text-stone-300 dark:ring-white/8",
    success:
      "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/15",
    warning:
      "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/15",
    danger:
      "bg-red-50 text-red-600 ring-1 ring-red-200/60 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/15",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
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
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconBox icon={icon} /> : null}
        <div className="min-w-0">
          {kicker ? (
            <div className="theme-muted text-[10px] font-black uppercase tracking-[0.22em]">
              {kicker}
            </div>
          ) : null}
          <h2 className="font-serif-display theme-heading mt-1 text-xl font-black tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="theme-subheading mt-2 max-w-2xl text-sm font-medium leading-[1.8]">
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
        "flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-stone-200/60 bg-white/60 p-8 text-center shadow-inner dark:border-white/8 dark:bg-white/[0.02]",
        className,
      )}
    >
      <IconBox
        icon={Icon}
        className="mb-4 h-12 w-12 bg-stone-100/60 text-stone-500 shadow-none dark:bg-white/[0.04]"
      />
      <p className="text-sm font-black tracking-tight text-stone-700 dark:text-stone-200">
        {title}
      </p>
      <p className="mt-2 max-w-sm text-sm font-medium leading-[1.8] text-stone-500 dark:text-stone-400">
        {description}
      </p>
    </div>
  );
}

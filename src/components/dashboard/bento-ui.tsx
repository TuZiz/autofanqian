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
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-inner ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-300/20",
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
        "relative overflow-hidden rounded-[24px] border border-white/60 bg-white/70 p-6 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10",
        hover && "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:bg-zinc-900/80 dark:hover:shadow-black/30",
        className,
      )}
    >
      {noise ? (
        <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay dark:opacity-[0.05]" />
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
      "bg-blue-50/80 text-blue-700 border border-blue-200/80 shadow-sm dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
    muted:
      "bg-zinc-50/80 text-zinc-600 border border-zinc-200/80 shadow-sm dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-700/80",
    success:
      "bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    warning:
      "bg-amber-50/80 text-amber-700 border border-amber-200/80 shadow-sm dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    danger:
      "bg-red-50/80 text-red-700 border border-red-200/80 shadow-sm dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
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
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {kicker}
            </div>
          ) : null}
          <h2 className="mt-1.5 truncate text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
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
        "flex min-h-[280px] flex-col items-center justify-center rounded-[32px] border border-dashed border-zinc-300/80 bg-zinc-50/50 p-10 text-center shadow-inner dark:border-zinc-700/80 dark:bg-zinc-900/50",
        className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100/80 text-zinc-400 shadow-inner ring-1 ring-zinc-200/50 dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-zinc-700/50">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-lg font-black tracking-tight text-zinc-950 dark:text-white">
        {title}
      </p>
      <p className="mt-3 max-w-sm text-sm font-bold leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import {
  Bot,
  ChevronRight,
  Command,
  Compass,
  FileText,
  Home,
  Library,
  Loader2,
  type LucideIcon,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
  mobileNav?: ReactNode;
  sidebar?: ReactNode;
};

export function AppShell({
  actions,
  children,
  className,
  maxWidthClassName = "max-w-[1440px]",
  mobileNav,
  sidebar,
}: AppShellProps) {
  return (
    <main
      className={cn(
        "ds-shell relative min-h-dvh overflow-x-clip bg-[var(--theme-bg)] text-[var(--theme-text-primary)]",
        className,
      )}
    >
      <div className="pointer-events-none fixed inset-0 ds-surface-aurora" />
      <div className="pointer-events-none fixed inset-0 ds-paper-grain" />
      <div className={cn("relative z-10 mx-auto flex min-h-dvh w-full", maxWidthClassName)}>
        {sidebar ? <div className="hidden shrink-0 lg:block">{sidebar}</div> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {actions ? <div className="sticky top-0 z-40">{actions}</div> : null}
          <div className="min-w-0 flex-1 px-3 pb-28 pt-3 sm:px-4 sm:pb-32 lg:px-5 lg:pb-6">
            {children}
          </div>
        </div>
      </div>
      {mobileNav}
    </main>
  );
}

export function TopBar({
  actions,
  meta,
  title,
}: {
  actions?: ReactNode;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <header className="border-b border-[var(--theme-divider)] bg-[var(--theme-topbar)]/95 px-3 py-2 backdrop-blur-xl sm:px-4 lg:px-5">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-extrabold text-[var(--theme-text-strong)] sm:text-base">
            {title}
          </h1>
          {meta ? (
            <div className="mt-0.5 hidden truncate text-xs font-medium text-[var(--theme-text-muted)] sm:block">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type PageHeaderProps = {
  actions?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  subtitle?: string;
  title: string;
};

export function PageHeader({
  actions,
  eyebrow,
  icon: Icon,
  meta,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-4 py-3 shadow-[var(--theme-shadow-card)] backdrop-blur-md sm:px-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--theme-brand-soft)] opacity-40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-[var(--theme-brand-subtle)] opacity-30 blur-2xl" />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-bold text-[var(--theme-text-muted)]">{eyebrow}</p>
            ) : null}
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
                {subtitle}
              </p>
            ) : null}
            {meta ? <div className="mt-2 flex flex-wrap gap-2">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type SurfaceVariant = "soft" | "card" | "elevated";

export function Surface({
  className,
  variant = "card",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: SurfaceVariant }) {
  const variants: Record<SurfaceVariant, string> = {
    soft: "bg-[var(--theme-surface-soft)] shadow-none",
    card: "bg-[var(--theme-surface-solid)] shadow-[var(--theme-shadow-card)]",
    elevated: "bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-panel)]",
  };

  return (
    <div
      {...props}
      className={cn("rounded-2xl border border-[var(--theme-border)]", variants[variant], className)}
    />
  );
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Surface {...props} variant="elevated" className={className} />;
}

type SectionCardProps = HTMLAttributes<HTMLElement> & {
  accent?: boolean;
  actions?: ReactNode;
  description?: string;
  icon?: LucideIcon;
  title?: string;
  variant?: SurfaceVariant;
};

export function SectionCard({
  accent = true,
  actions,
  children,
  className,
  description,
  icon: Icon,
  title,
  variant = "card",
  ...props
}: SectionCardProps) {
  const variants: Record<SurfaceVariant, string> = {
    soft: "bg-[var(--theme-surface-soft)] shadow-none",
    card: "bg-[var(--theme-surface-solid)] shadow-[var(--theme-shadow-card)]",
    elevated: "bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-panel)]",
  };

  return (
    <section
      {...props}
      className={cn("group/section relative overflow-hidden rounded-2xl border border-[var(--theme-border)]", variants[variant], className)}
    >
      {accent ? (
        <div className="theme-brand-gradient-bg pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover/section:opacity-100" />
      ) : null}
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-[var(--theme-divider)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-border)]">
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate text-base font-extrabold text-[var(--theme-text-strong)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm font-medium leading-5 text-[var(--theme-text-secondary)]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

type ButtonTone = "primary" | "secondary" | "ghost" | "danger" | "ai";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  icon?: LucideIcon;
  tone?: ButtonTone;
};

export function Button({
  busy,
  children,
  className,
  disabled,
  icon: Icon,
  tone = "secondary",
  ...props
}: ButtonProps) {
  const toneClass: Record<ButtonTone, string> = {
    ai: "theme-ai-gradient-bg border-transparent text-white shadow-[0_10px_24px_rgba(47,128,237,0.16)] hover:-translate-y-0.5 active:translate-y-px",
    danger:
      "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] hover:brightness-95",
    ghost:
      "border-transparent bg-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
    primary:
      "theme-brand-gradient-bg border-transparent text-white shadow-[var(--theme-shadow-button)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px",
    secondary:
      "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-button)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
  };

  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--theme-bg)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        toneClass[tone],
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

type AiButtonProps = Omit<ButtonProps, "tone"> & {
  progress?: number;
};

export function AiButton({
  children,
  className,
  icon = Sparkles,
  progress,
  ...props
}: AiButtonProps) {
  return (
    <Button {...props} tone="primary" icon={icon} className={cn("relative overflow-hidden", className)}>
      <span className="pointer-events-none absolute inset-0 ds-ai-sheen opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative">{children}</span>
      {typeof progress === "number" ? (
        <span className="relative text-xs opacity-80">{Math.round(progress)}%</span>
      ) : null}
    </Button>
  );
}

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon: Icon = FileText,
  title,
}: EmptyStateProps) {
  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-5 py-8 text-center">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--theme-brand-soft)] opacity-30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-[var(--theme-brand-subtle)] opacity-20 blur-2xl" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] shadow-[var(--theme-shadow-button)] ring-1 ring-[var(--theme-border)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="relative mt-4 text-lg font-extrabold text-[var(--theme-text-strong)]">{title}</h3>
      <p className="relative mt-2 max-w-md text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
        {description}
      </p>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[linear-gradient(90deg,var(--theme-surface-overlay),var(--theme-surface-hover),var(--theme-surface-overlay))] bg-[length:220%_100%]",
        className,
      )}
    />
  );
}

type StatusTone = "neutral" | "success" | "warning" | "danger" | "ai";

export function StatusBadge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: StatusTone;
}) {
  const toneClass: Record<StatusTone, string> = {
    ai: "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
    danger: "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]",
    neutral: "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
    success:
      "border-[var(--theme-success-border)] bg-[var(--theme-success-soft)] text-[var(--theme-success-text)]",
    warning:
      "border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]",
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold leading-none",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper?: string;
  icon?: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-3 shadow-[var(--theme-shadow-button)] transition-all duration-300 hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow-card)]">
      <div className="theme-brand-gradient-bg pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[var(--theme-text-muted)]">{label}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-[var(--theme-text-strong)]">{value}</p>
        </div>
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)] transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {helper ? (
        <p className="mt-2 truncate text-xs font-medium text-[var(--theme-text-secondary)]">{helper}</p>
      ) : null}
    </div>
  );
}

export function ProgressPanel({
  description,
  label,
  progress,
  status,
}: {
  description?: string;
  label: string;
  progress: number;
  status?: ReactNode;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--theme-brand-text)]">
            <Sparkles className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </div>
          {description ? (
            <p className="mt-1 text-xs font-medium leading-5 text-[var(--theme-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--theme-surface-solid)]">
        <div
          className="theme-brand-gradient-bg h-full rounded-full transition-[width] duration-500"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

export function RightInspector({
  children,
  className,
  title = "Inspector",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <aside className={cn("min-w-0 lg:h-full lg:min-h-0", className)}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-card)]">
        <div className="border-b border-[var(--theme-divider)] px-4 py-3">
          <p className="text-[11px] font-bold text-[var(--theme-text-muted)]">{title}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </aside>
  );
}

export function WriterTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[58vh] w-full resize-y rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-paper)] px-5 py-5 text-[17px] font-medium leading-9 text-[var(--theme-text-primary)] shadow-[var(--theme-shadow-paper)] outline-none transition focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-subtle)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-8 sm:py-7 sm:text-[18px]",
        className,
      )}
    />
  );
}

type MobileNavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

export function MobileBottomNav({
  activeHref,
  items,
  onCommandOpen,
}: {
  activeHref?: string;
  items?: MobileNavItem[];
  onCommandOpen?: () => void;
}) {
  const resolvedItems =
    items ??
    ([
      { href: "/dashboard", icon: Home, label: "工作台" },
      { href: "/dashboard/create", icon: Plus, label: "新建" },
      { href: "/dashboard/import", icon: Library, label: "导入" },
    ] satisfies MobileNavItem[]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/98 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(25,20,16,0.08)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {resolvedItems.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const active = activeHref ? activeHref === item.href : false;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition",
                active
                  ? "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                  : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onCommandOpen}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
        >
          <Command className="h-4 w-4" />
          命令
        </button>
      </div>
    </nav>
  );
}

export function CommandMenuHint({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-10 min-w-[176px] items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-medium text-[var(--theme-text-muted)] shadow-[var(--theme-shadow-button)] transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] md:flex"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        快速命令
      </span>
      <kbd className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-1.5 py-0.5 text-[11px] font-bold">
        Ctrl K
      </kbd>
    </button>
  );
}

export function FieldShell({
  className,
  icon: Icon,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
  inputClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 shadow-[var(--theme-shadow-button)] transition focus-within:border-[var(--theme-brand-border)] focus-within:ring-4 focus-within:ring-[var(--theme-brand-subtle)]",
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" /> : null}
      <input
        {...props}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-muted)] disabled:cursor-not-allowed disabled:opacity-60",
          inputClassName,
        )}
      />
    </div>
  );
}

export function LinkButton({
  children,
  className,
  href,
  icon: Icon,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 text-sm font-bold text-[var(--theme-text-strong)] shadow-[var(--theme-shadow-button)] transition hover:-translate-y-0.5 hover:bg-[var(--theme-surface-hover)] active:translate-y-0",
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
      <ChevronRight className="h-4 w-4 opacity-50" />
    </Link>
  );
}

export const designSystemIcons = {
  Bot,
  Compass,
  Library,
  Sparkles,
};

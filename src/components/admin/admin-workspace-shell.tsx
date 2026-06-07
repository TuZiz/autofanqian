"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { AppShell } from "@/components/design-system";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

import { AdminStatusPill } from "./admin-console-primitives";

type AdminBreadcrumbItem = {
  href?: string;
  label: string;
};

type AdminWorkspaceShellProps = {
  breadcrumbs: AdminBreadcrumbItem[];
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  meta?: ReactNode;
  subtitle: string;
  title: string;
  userEmail: string;
};

export function AdminWorkspaceShell({
  breadcrumbs,
  children,
  description,
  icon,
  meta,
  subtitle,
  title,
  userEmail,
}: AdminWorkspaceShellProps) {
  const Icon = icon;

  return (
    <AppShell
      actions={
        <DashboardTopbar
          title="管理员控制台"
          userEmail={userEmail}
          isAdmin
          showBackToDashboard
          showAdminLink={false}
          logoutLabel="退出登录"
          maxWidthClassName="max-w-[1380px]"
          centerContent={<AdminBreadcrumb items={breadcrumbs} />}
        />
      }
      maxWidthClassName="max-w-[1380px]"
    >
      <div className="space-y-4">
        <header className="rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-4 shadow-[var(--theme-shadow-card)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                {description}
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] shadow-[var(--theme-shadow-button)]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[20px] font-black tracking-[-0.03em] text-[var(--theme-text-strong)] sm:text-[22px]">
                    {title}
                  </h1>
                  <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-[var(--theme-text-secondary)] sm:text-sm">
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>
            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </AppShell>
  );
}

type AdminLeftNavProps = {
  activeId: string;
  items: Array<{
    description: string;
    icon: LucideIcon;
    id: string;
    title: string;
    badge?: string;
  }>;
  onSelect: (id: string) => void;
  title?: string;
};

export function AdminLeftNav({
  activeId,
  items,
  onSelect,
  title = "模块导航",
}: AdminLeftNavProps) {
  return (
    <aside className="rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-[var(--theme-shadow-card)]">
      <div className="mb-3 px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
          {title}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group relative overflow-hidden rounded-[16px] border px-3 py-3 text-left transition ${
                selected
                  ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] shadow-[var(--theme-shadow-card)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]"
              }`}
            >
              <span
                className={`absolute inset-y-3 left-0 w-1 rounded-r-full transition ${
                  selected
                    ? "bg-[var(--theme-brand-500)]"
                    : "bg-transparent group-hover:bg-[var(--theme-brand-border)]"
                }`}
              />
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3 pl-2">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${
                      selected
                        ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black text-[var(--theme-text-strong)]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium leading-5 text-[var(--theme-text-muted)]">
                      {item.description}
                    </span>
                    {item.badge ? (
                      <span className="mt-2 inline-flex rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2 py-0.5 text-[10px] font-black text-[var(--theme-text-secondary)]">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronRight
                  className={`mt-0.5 h-4 w-4 shrink-0 transition ${
                    selected
                      ? "translate-x-0 text-[var(--theme-brand-text)]"
                      : "text-[var(--theme-text-muted)] group-hover:translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

type AdminWorkspaceLayoutProps = {
  children: ReactNode;
  drawer?: ReactNode;
  leftNav: ReactNode;
};

export function AdminWorkspaceLayout({
  children,
  drawer,
  leftNav,
}: AdminWorkspaceLayoutProps) {
  return (
    <div
      className={`grid gap-4 ${
        drawer
          ? "xl:grid-cols-[240px_minmax(0,1fr)_320px]"
          : "xl:grid-cols-[240px_minmax(0,1fr)]"
      }`}
    >
      {leftNav}
      {children}
      {drawer}
    </div>
  );
}

type AdminDetailDrawerProps = {
  children: ReactNode;
  emptyDescription?: string;
  emptyTitle?: string;
  onClose?: () => void;
  selected: boolean;
  title: string;
};

export function AdminDetailDrawer({
  children,
  emptyDescription = "请在左侧列表中选择一项进行编辑。",
  emptyTitle = "未选择项目",
  selected,
  title,
}: AdminDetailDrawerProps) {
  if (!selected) {
    return (
      <aside className="hidden rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-[var(--theme-shadow-card)] xl:block">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-[13px] font-black text-[var(--theme-text-strong)]">
              {emptyTitle}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[var(--theme-text-muted)]">
              {emptyDescription}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-[var(--theme-shadow-card)] xl:block">
      <div className="border-b border-[var(--theme-divider)] px-4 py-3">
        <h3 className="text-[13px] font-black text-[var(--theme-text-strong)]">
          {title}
        </h3>
      </div>
      <div className="max-h-[calc(100dvh-260px)] overflow-y-auto p-3">
        {children}
      </div>
    </aside>
  );
}

function AdminBreadcrumb({ items }: { items: AdminBreadcrumbItem[] }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-muted)] shadow-[var(--theme-shadow-button)] lg:flex">
      <Link
        href="/dashboard"
        className="transition hover:text-[var(--theme-text-strong)]"
      >
        工作台
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <Link
        href="/dashboard/admin"
        className="transition hover:text-[var(--theme-text-strong)]"
      >
        管理后台
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5" />
          {item.href ? (
            <Link
              href={item.href}
              className="transition hover:text-[var(--theme-text-strong)]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--theme-text-strong)]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function AdminAutoSaveStatus({
  state,
  lastSavedAt,
  error,
}: {
  error?: string;
  lastSavedAt: Date | null;
  state: "dirty" | "error" | "idle" | "saved" | "saving";
}) {
  const stateMeta = {
    idle: { text: "等待配置加载", tone: "neutral" as const },
    dirty: { text: "待自动保存", tone: "warning" as const },
    saving: { text: "自动保存中", tone: "brand" as const },
    saved: { text: "已自动保存", tone: "success" as const },
    error: { text: error || "自动保存失败", tone: "danger" as const },
  };
  const meta = stateMeta[state];

  return (
    <AdminStatusPill tone={meta.tone}>
      <span className="truncate">{meta.text}</span>
      {lastSavedAt ? (
        <span className="hidden text-[10px] font-bold opacity-80 sm:inline">
          {lastSavedAt.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : null}
    </AdminStatusPill>
  );
}

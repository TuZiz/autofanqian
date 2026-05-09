"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LayoutGrid, LogOut, Plus, Shield, Sparkles } from "lucide-react";

import { formatRelativeTime } from "@/lib/dashboard/dashboard-format";
import { getEditorialTone, getTitleInitial } from "@/lib/dashboard/dashboard-visual";
import type { DashboardWork } from "@/lib/dashboard/dashboard-types";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  displayName: string;
  isAdmin: boolean;
  logoutBusy: boolean;
  onCreate: () => void;
  onLogoutOpen: () => void;
  onProfileOpen: () => void;
  recentWorks: DashboardWork[];
};

export function DashboardSidebar({
  displayName,
  isAdmin,
  logoutBusy,
  onCreate,
  onLogoutOpen,
  onProfileOpen,
  recentWorks,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 lg:flex">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
            我要当作者
          </h2>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        <SidebarLink active href="/dashboard" icon={<LayoutGrid className="h-4 w-4" />}>
          控制台
        </SidebarLink>
        <button
          type="button"
          onClick={onCreate}
          className="group flex h-9 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-[var(--theme-text-secondary)] transition-all hover:bg-[var(--theme-surface-strong)] hover:text-[var(--theme-text-strong)]"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          新建作品
        </button>
        {isAdmin && (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-4 w-4" />}>
            管理系统
          </SidebarLink>
        )}

        {recentWorks.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-[var(--theme-text-muted)] uppercase">
              近期宇宙
            </h3>
            <div className="flex flex-col gap-1">
              {recentWorks.map((work) => (
                <RecentWorkLink key={work.id} work={work} />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onProfileOpen}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-[var(--theme-surface-hover)]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--theme-brand-soft)] text-sm font-semibold text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-bold text-[var(--theme-text-strong)]">
                {displayName}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                作者设置
              </div>
            </div>
          </button>
          <button
            type="button"
            disabled={logoutBusy}
            onClick={onLogoutOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800/80 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="退出"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  active = false,
  href,
  icon,
  children,
}: {
  active?: boolean;
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold no-underline transition-all",
        active
          ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
          : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-strong)] hover:text-[var(--theme-text-strong)]",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function RecentWorkLink({ work }: { work: DashboardWork }) {
  const tone = getEditorialTone(`${work.id}:${work.title}`);

  return (
    <Link
      href={`/dashboard/novel/${work.id}`}
      className="group flex min-w-0 items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-[var(--theme-surface-strong)]"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white shadow-sm"
        style={{ backgroundImage: tone.coverGradient }}
      >
        {getTitleInitial(work.title)}
      </span>
      <div className="min-w-0">
        <span className="block truncate text-sm font-bold text-zinc-700 transition-colors group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white">
          {work.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
          {formatRelativeTime(work.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FileInput,
  LayoutDashboard,
  LogOut,
  Plus,
  Shield,
  Sparkles,
} from "lucide-react";

import { Button, StatusBadge } from "@/components/design-system";
import { formatRelativeTime } from "@/lib/dashboard/dashboard-format";
import { getEditorialTone, getTitleInitial } from "@/lib/dashboard/dashboard-visual";
import type { DashboardWork } from "@/lib/dashboard/dashboard-types";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  activeWorkId: string | null;
  displayName: string;
  isAdmin: boolean;
  logoutBusy: boolean;
  onCreate: () => void;
  onLogoutOpen: () => void;
  onProfileOpen: () => void;
  recentWorks: DashboardWork[];
};

export function DashboardSidebar({
  activeWorkId,
  displayName,
  isAdmin,
  logoutBusy,
  onCreate,
  onLogoutOpen,
  onProfileOpen,
  recentWorks,
}: DashboardSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar)] p-3 text-[var(--theme-sidebar-foreground)] backdrop-blur-2xl lg:flex">
      <div className="mb-4 flex items-center gap-3 px-1 py-1">
        <div className="theme-brand-gradient-bg flex h-10 w-10 items-center justify-center rounded-[4px] text-white shadow-[0_0_24px_var(--theme-primary-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            创作驾驶舱
          </h2>
          <p className="truncate text-xs font-medium text-[var(--theme-text-muted)]">
            TuZiz / autofanqian
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <SidebarLink active href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
          作者工作台
        </SidebarLink>
        <button
          type="button"
          onClick={onCreate}
          className="group flex min-h-10 items-center gap-2 rounded-[4px] px-3 text-left text-sm font-bold text-[var(--theme-text-secondary)] transition hover:bg-[var(--theme-sidebar-active)] hover:text-[var(--theme-text-strong)]"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          新建作品
        </button>
        <SidebarLink href="/dashboard/import" icon={<FileInput className="h-4 w-4" />}>
          导入作品
        </SidebarLink>
        {isAdmin ? (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-4 w-4" />}>
            管理后台
          </SidebarLink>
        ) : null}

        <div className="mt-5 min-h-0">
          <div className="mb-2 flex items-center justify-between px-2">
            <h3 className="text-[11px] font-bold text-[var(--theme-text-muted)]">最近作品</h3>
            {recentWorks.length > 0 ? <StatusBadge tone="ai">{recentWorks.length}</StatusBadge> : null}
          </div>
          <div className="flex flex-col gap-1">
            {recentWorks.length > 0 ? (
              recentWorks.map((work) => (
                <RecentWorkLink active={work.id === activeWorkId} key={work.id} work={work} />
              ))
            ) : (
              <div className="rounded-[4px] border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 py-3 text-xs leading-5 text-[var(--theme-text-secondary)]">
                还没有作品。新建或导入后，这里会显示最近写作入口。
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="mt-4 rounded-[4px] border border-[var(--theme-sidebar-border)] bg-[var(--theme-surface-solid)]/72 p-2 shadow-[var(--theme-shadow-card)]">
        <button
          type="button"
          onClick={onProfileOpen}
          className="flex w-full min-w-0 items-center gap-2 rounded-[4px] p-2 text-left transition hover:bg-[var(--theme-sidebar-active)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--theme-brand-soft)] text-sm font-extrabold text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-[var(--theme-text-strong)]">
              {displayName}
            </div>
            <div className="text-[11px] font-medium text-[var(--theme-text-muted)]">
              账号与会员
            </div>
          </div>
        </button>
        <Button
          type="button"
          tone="ghost"
          disabled={logoutBusy}
          onClick={onLogoutOpen}
          className="mt-1 h-9 w-full justify-start rounded-[4px] px-2 text-[var(--theme-text-muted)] hover:bg-[var(--theme-danger-soft)] hover:text-[var(--theme-danger-text)]"
          icon={LogOut}
        >
          {logoutBusy ? "退出中..." : "退出登录"}
        </Button>
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
        "relative flex min-h-10 items-center gap-2 rounded-[4px] px-3 text-sm font-bold no-underline transition",
        active
          ? "bg-[var(--theme-sidebar-active)] text-[var(--theme-text-strong)] shadow-[0_0_18px_var(--theme-primary-glow)]"
          : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-sidebar-active)] hover:text-[var(--theme-text-strong)]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 bg-[var(--theme-brand-600)]" />
      ) : null}
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}

function RecentWorkLink({ active, work }: { active: boolean; work: DashboardWork }) {
  const tone = getEditorialTone(`${work.id}:${work.title}`);

  return (
    <Link
      href={`/dashboard/novel/${work.id}`}
      className={cn(
        "group/link relative flex min-w-0 items-center gap-2 rounded-[4px] px-2 py-1.5 transition hover:bg-[var(--theme-sidebar-active)]",
        active && "bg-[var(--theme-sidebar-active)]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 bg-[var(--theme-brand-600)] shadow-[0_0_18px_var(--theme-primary-glow)]" />
      ) : null}
      <span className="relative">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-sm font-extrabold text-white shadow-[var(--theme-shadow-button)] transition-transform duration-200 group-hover/link:scale-110"
          style={{ backgroundImage: tone.coverGradient }}
        >
          {getTitleInitial(work.title)}
        </span>
        <span
          className="pointer-events-none absolute -inset-0.5 rounded-[3px] opacity-0 blur-sm transition-opacity duration-200 group-hover/link:opacity-30"
          style={{ backgroundImage: tone.coverGradient }}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--theme-text-strong)]">
          {work.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--theme-text-muted)]">
          {formatRelativeTime(work.updatedAt)}
        </span>
      </span>
    </Link>
  );
}

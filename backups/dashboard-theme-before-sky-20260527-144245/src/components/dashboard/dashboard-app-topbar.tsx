"use client";

import { LayoutDashboard, LogOut, Plus, Shield, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { zhCN } from "@/lib/copy/zh-cn";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";

type DashboardAppTopbarProps = {
  dashboard: DashboardClientController;
  onProfileOpen: () => void;
  onLogoutOpen: () => void;
};

export function DashboardAppTopbar({
  dashboard,
  onProfileOpen,
  onLogoutOpen,
}: DashboardAppTopbarProps) {
  const { logoutBusy, user } = dashboard;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--theme-divider)] bg-[var(--theme-topbar)] backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: logo + app name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--theme-brand-500)] shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-[var(--theme-text-strong)]">
            {zhCN.app.shortName}
          </span>
        </div>

        {/* Center: nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <TopbarLink active href="/dashboard" icon={<LayoutDashboard className="h-3.5 w-3.5" />}>
            工作台
          </TopbarLink>
          <TopbarLink href="/dashboard/create" icon={<Plus className="h-3.5 w-3.5" />}>
            创建
          </TopbarLink>
          {user?.isAdmin ? (
            <TopbarLink href="/dashboard/admin" icon={<Shield className="h-3.5 w-3.5" />}>
              管理
            </TopbarLink>
          ) : null}
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {user?.email ? (
            <span className="mr-1 hidden text-xs text-[var(--theme-text-muted)] md:inline-block">
              {user.email}
            </span>
          ) : null}
          <ThemeToggle className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--theme-text-secondary)]" />
          <button
            type="button"
            onClick={onProfileOpen}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] transition hover:bg-[var(--theme-surface-hover)]"
            aria-label="个人设置"
          >
            <UserRound className="h-4 w-4 text-[var(--theme-text-secondary)]" />
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLogoutOpen}
            disabled={logoutBusy}
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─── Topbar nav link ─── */

function TopbarLink({
  active,
  children,
  icon,
  href,
}: {
  active?: boolean;
  children: ReactNode;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)]"
          : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-overlay)] hover:text-[var(--theme-text-strong)]",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {children}
    </Link>
  );
}

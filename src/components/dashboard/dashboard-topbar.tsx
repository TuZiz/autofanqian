"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { type ReactNode, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import { apiRequest } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";
import { cn } from "@/lib/utils";

export type DashboardTopbarProps = {
  title: string;
  userEmail?: string;
  isAdmin?: boolean;
  showBackToDashboard?: boolean;
  backHref?: string;
  backLabel?: string;
  showAdminLink?: boolean;
  adminHref?: string;
  adminLabel?: string;
  logoutLabel?: string;
  maxWidthClassName?: string;
  className?: string;
  centerContent?: ReactNode;
};

export function DashboardTopbar({
  title,
  userEmail,
  isAdmin,
  showBackToDashboard = false,
  backHref = "/dashboard",
  backLabel = "返回工作台",
  showAdminLink = true,
  adminHref = "/dashboard/admin",
  adminLabel = "管理员",
  logoutLabel = "退出登录",
  maxWidthClassName = "max-w-[1400px]",
  className,
  centerContent,
}: DashboardTopbarProps) {
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  async function handleLogout() {
    if (logoutBusy) return;

    setLogoutBusy(true);
    try {
      const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});

      if (response.success && response.data?.redirectTo) {
        window.location.href = response.data.redirectTo;
      }
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <header className={cn("theme-topbar relative z-50 border-b backdrop-blur-xl", className)}>
      <div className="pointer-events-none absolute inset-0 app-noise opacity-[0.03] dark:opacity-[0.12]" />

      <div
        className={cn(
          "relative mx-auto flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 sm:px-6",
          maxWidthClassName,
        )}
      >
        <div className="min-w-0 shrink-0">
          <div className="theme-kicker text-[10px] font-bold uppercase tracking-[0.25em]">
            {zhCN.app.shortName}
          </div>
          <div className="font-serif-display theme-heading mt-1 text-base font-bold tracking-wide sm:text-lg">
            {title}
          </div>
        </div>

        {centerContent ? (
          <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">{centerContent}</div>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3">
          {showBackToDashboard ? (
            <Link
              href={backHref}
              title={backLabel}
              className="theme-button-secondary inline-flex h-10 w-10 items-center justify-center rounded-full p-0 text-xs font-bold shadow-none active:scale-95 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          ) : null}

          {isAdmin && showAdminLink ? (
            <>
              <Link
                href={adminHref}
                className="theme-button-primary inline-flex h-10 w-10 items-center justify-center rounded-full p-0 text-xs font-bold sm:hidden active:scale-95"
                aria-label={adminLabel}
              >
                <Shield className="h-4 w-4" />
              </Link>
              <Link
                href={adminHref}
                className="theme-button-primary group hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-bold sm:inline-flex sm:text-sm active:scale-95"
              >
                <Shield className="h-4 w-4 transition-transform group-hover:-rotate-12" />
                {adminLabel}
              </Link>
            </>
          ) : null}

          {userEmail ? (
            <div className="hidden min-w-0 max-w-[240px] rounded-full border border-[var(--theme-border)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-right md:block">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
                当前账号
              </div>
              <div className="truncate text-sm font-semibold text-[var(--theme-text-secondary)]">{userEmail}</div>
            </div>
          ) : null}

          <ThemeToggle className="h-10 w-10 rounded-full p-0" />

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={logoutBusy}
            className="theme-button-secondary rounded-full px-4 py-2 text-xs font-semibold sm:text-sm active:scale-95"
          >
            {logoutBusy ? "退出中..." : logoutLabel}
          </button>
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        busy={logoutBusy}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await handleLogout();
          } finally {
            setLogoutConfirmOpen(false);
          }
        }}
      />
    </header>
  );
}

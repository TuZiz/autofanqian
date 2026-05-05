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
    if (logoutBusy) {
      return;
    }

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
    <header className={cn("theme-topbar relative z-50 sticky top-0 border-b backdrop-blur-xl", className)}>
      <div className="absolute inset-0 pointer-events-none app-noise opacity-[0.03] dark:opacity-[0.12]" />

      <div
        className={cn(
          "relative mx-auto flex items-center justify-between px-4 py-3.5 sm:px-6",
          maxWidthClassName,
        )}
      >
        <div className="flex shrink-0 flex-col justify-center leading-tight">
          <div className="theme-kicker text-[10px] font-bold uppercase tracking-[0.25em]">
            {zhCN.app.shortName}
          </div>
          <div className="font-serif-display theme-heading mt-0.5 text-base font-bold tracking-wide sm:text-lg">
            {title}
          </div>
        </div>

        {centerContent ? (
          <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
            {centerContent}
          </div>
        ) : null}

        <div className="flex items-center gap-3 sm:gap-5">
          {showBackToDashboard ? (
            <Link
              href={backHref}
              title={backLabel}
              className="theme-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-lg p-0 text-xs font-bold shadow-none transition active:scale-95 sm:w-auto sm:gap-2 sm:px-3.5 sm:text-sm"
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
                className="theme-button-primary inline-flex h-9 w-9 items-center justify-center rounded-lg p-0 text-xs font-bold sm:hidden active:scale-95"
                aria-label={adminLabel}
              >
                <Shield className="h-4 w-4" />
              </Link>
              <Link
                href={adminHref}
                className="theme-button-primary group hidden items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold sm:inline-flex sm:text-sm active:scale-95"
              >
                <Shield className="h-3.5 w-3.5 transition-transform group-hover:-rotate-12 sm:h-4 sm:w-4" />
                {adminLabel}
              </Link>
            </>
          ) : null}

          <div className="theme-divider hidden h-5 w-px border-l md:block" />

          <span className="theme-subheading hidden text-sm font-medium md:inline-block">
            {userEmail ?? ""}
          </span>

          <div className="flex items-center gap-2.5">
            <ThemeToggle className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />

            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              disabled={logoutBusy}
              className="theme-button-secondary rounded-lg px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm active:scale-95"
            >
              {logoutBusy ? "退出中..." : logoutLabel}
            </button>
          </div>
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

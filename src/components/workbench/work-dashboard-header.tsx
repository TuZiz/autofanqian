import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

export function WorkDashboardHeader({ dashboard }: { dashboard: WorkDashboardController }) {
  const { handleLogout, isAdmin, logoutBusy, userEmail } = dashboard;
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/60 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
      <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="group flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/50 transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800/50 dark:hover:bg-zinc-800 dark:hover:ring-zinc-700"
            title="返回上层"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100" />
          </Link>
          <div className="hidden h-8 w-px bg-zinc-200/60 sm:block dark:bg-zinc-800/60" />
          <div className="min-w-0">
            <p className="hidden text-xs font-bold uppercase tracking-wider text-zinc-500 sm:block dark:text-zinc-400">
              创作驾驶舱
            </p>
            <h1 className="truncate text-base font-black text-zinc-900 dark:text-zinc-100 sm:text-lg">
              作品详情
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="hidden max-w-[240px] truncate text-xs font-bold text-zinc-500 md:block dark:text-zinc-400">
            {userEmail}
          </span>
          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="hidden h-10 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-bold text-blue-700 ring-1 ring-blue-200/50 transition-all hover:bg-blue-100 hover:ring-blue-300 sm:inline-flex dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20 dark:hover:bg-blue-500/20 dark:hover:ring-blue-500/30"
            >
              <ShieldCheck className="h-4 w-4" />
              管理员
            </Link>
          ) : null}
          <ThemeToggle className="h-10 w-10 rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/50 transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800/50 dark:hover:bg-zinc-800 dark:hover:ring-zinc-700" />
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={logoutBusy}
            className="hidden h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-zinc-600 shadow-sm ring-1 ring-zinc-200/50 transition-all hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800/50 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:hover:ring-red-500/30"
          >
            <LogOut className="h-4 w-4" />
            {logoutBusy ? "退出中..." : "退出登录"}
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

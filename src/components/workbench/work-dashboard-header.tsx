import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

export function WorkDashboardHeader({ dashboard }: { dashboard: WorkDashboardController }) {
  const { handleLogout, isAdmin, logoutBusy, userEmail } = dashboard;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#fafbf7]/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0d1117]/95">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between px-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
            title="返回上层"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />
          <div className="min-w-0">
            <p className="hidden text-xs font-semibold text-slate-500 sm:block dark:text-slate-500">
              创作驾驶舱
            </p>
            <h1 className="truncate text-sm font-black text-slate-950 dark:text-slate-50 sm:text-base">
              作品详情
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm">
          <span className="hidden max-w-[240px] truncate text-xs font-semibold text-slate-500 md:block dark:text-slate-400">
            {userEmail}
          </span>
          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 sm:inline-flex dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              管理员
            </Link>
          ) : null}
          <ThemeToggle className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white" />
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutBusy}
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            {logoutBusy ? "退出中..." : "退出登录"}
          </button>
        </div>
      </div>
    </header>
  );
}

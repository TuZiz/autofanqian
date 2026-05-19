import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

type HeaderSectionId = "overview" | "chapters" | "outline" | "characters" | "context";

export function WorkDashboardHeader({
  activeSection,
  dashboard,
  onSectionChange,
}: {
  activeSection: HeaderSectionId;
  dashboard: WorkDashboardController;
  onSectionChange: (sectionId: HeaderSectionId) => void;
}) {
  const {
    chapters,
    handleLogout,
    isAdmin,
    logoutBusy,
    outline,
    plannedChapterCount,
    progressPercent,
    targetChapterCount,
    userEmail,
    work,
  } = dashboard;
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const isShortStory = isShortStoryWork(work?.workType);
  const writtenChapterCount = chapters.filter((chapter) => chapter.wordCount > 0).length;
  const sectionTabs = [
    { label: "总览", value: `${progressPercent || 0}%`, sectionId: "overview" as const },
    { label: isShortStory ? "场景" : "章节", value: `${writtenChapterCount} ${isShortStory ? "段" : "章"}`, sectionId: "chapters" as const },
    { label: isShortStory ? "结构" : "卷纲", value: `${plannedChapterCount || chapters.length} ${isShortStory ? "段" : "章"}`, sectionId: "outline" as const },
    { label: "人物", value: `${outline?.characters.length ?? 0} 人`, sectionId: "characters" as const },
    { label: "设定", value: `${targetChapterCount || 0} ${isShortStory ? "段" : "章"}`, sectionId: "context" as const },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-white/60 shadow-sm backdrop-blur-xl dark:border-[var(--theme-border)] dark:bg-zinc-950/60">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-12 items-center gap-2 sm:gap-4">
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-[var(--theme-border)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-zinc-900 dark:ring-[var(--theme-border)] dark:hover:bg-zinc-800 dark:hover:ring-[var(--theme-border)]"
              title="返回控制台"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" />
            </Link>

            <div className="hidden h-8 w-px bg-zinc-200/60 dark:bg-zinc-800/60 sm:block" />
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <div className="flex h-10 max-w-[600px] items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-[var(--theme-border)] dark:bg-zinc-900 dark:ring-[var(--theme-border)]">
              {sectionTabs.map((item) => {
                const active = activeSection === item.sectionId;
                return (
                  <button
                    key={`${item.label}-${item.sectionId}`}
                    type="button"
                    onClick={() => onSectionChange(item.sectionId)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-8 min-w-[78px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all",
                      active
                        ? "bg-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] opacity-70">{item.value}</span>
                  </button>
                );
              })}
            </div>
            <span className="max-w-[120px] truncate text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {userEmail?.split("@")[0]}
            </span>
          </div>

          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-200/50 transition-all hover:bg-emerald-100 hover:ring-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-500/30 sm:w-auto sm:gap-2 sm:px-4 sm:text-xs sm:font-semibold"
              title="管理员"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">管理员</span>
            </Link>
          ) : null}

          <ThemeToggle className="h-10 w-10 shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-[var(--theme-border)] dark:bg-zinc-900 dark:ring-[var(--theme-border)] dark:hover:bg-zinc-800 dark:hover:ring-[var(--theme-border)]" />
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={logoutBusy}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-zinc-600 shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex dark:bg-zinc-900 dark:text-zinc-300 dark:ring-[var(--theme-border)] dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:hover:ring-red-500/30"
          >
            <LogOut className="h-4 w-4" />
            {logoutBusy ? "退出中" : "退出"}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
          {sectionTabs.map((item) => {
            const active = activeSection === item.sectionId;
            return (
              <button
                key={`${item.label}-${item.sectionId}-mobile`}
                type="button"
                onClick={() => onSectionChange(item.sectionId)}
                aria-pressed={active}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-sm ring-1 transition-all",
                  active
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                    : "bg-white text-zinc-500 ring-[var(--theme-border)] hover:text-zinc-950 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-[var(--theme-border)] dark:hover:text-white",
                )}
              >
                <span>{item.label}</span>
                <span className="opacity-70">{item.value}</span>
              </button>
            );
          })}
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

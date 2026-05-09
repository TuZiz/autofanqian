"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Plus, BookOpen, Layers,
  Sparkles, PenTool, ArrowRight,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getProgressCopy,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";
import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardWorksSection } from "./dashboard-works-section";

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

import type { LucideIcon } from "lucide-react";

type DashboardStat = {
  icon: LucideIcon;
  label: string;
  tone: "amber" | "emerald" | "neutral" | "teal" | "sky" | "purple";
  value: string;
};

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const { handleLogout, logoutBusy, overview, updateUser, user } = dashboard;
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const works = overview?.works ?? [];
  const activeWork = overview?.activeWork ?? null;
  const activeProgress = activeWork ? getProgressCopy(activeWork) : null;
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "创作者";

  const continueHref = activeWork
    ? `/dashboard/novel/${activeWork.id}/chapter/${Math.max(1, activeWork.chapter.index)}`
    : "/dashboard/create";

  const stats = useMemo<DashboardStat[]>(() => {
    const words = formatWordStat(overview?.stats.totalWords ?? 0);
    return [
      {
        icon: PenTool,
        label: "创作总字数",
        tone: "sky",
        value: `${words.value}${words.unit}`,
      },
      {
        icon: BookOpen,
        label: "章节积累",
        tone: "amber",
        value: `${overview?.stats.chapterCount ?? 0}`,
      },
      {
        icon: Layers,
        label: "作品宇宙",
        tone: "emerald",
        value: `${overview?.stats.workCount ?? 0}`,
      },
    ];
  }, [overview]);

  return (
    <main className="app-work-surface min-h-dvh font-sans selection:bg-emerald-200/50 dark:selection:bg-emerald-500/30">
      <div className="flex h-dvh overflow-hidden">
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onCreate={() => router.push("/dashboard/create")}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
          onProfileOpen={() => setProfileOpen(true)}
          recentWorks={works.slice(0, 4)}
        />

        <section className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative">
          <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 py-4 sm:px-5 lg:px-6">
            <div className="flex flex-col gap-4">
              <header className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--theme-brand-600)]" />
                    <span>创作控制台</span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-3xl">
                    工作台
                  </h1>
                  <p className="mt-1 max-w-2xl truncate text-sm font-semibold text-[var(--theme-text-secondary)]">
                    {activeWork
                      ? `欢迎回来。您正在构建《${activeWork.title}》的世界。`
                      : "欢迎回来。创建一个新故事，开启今天的旅程。"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <ThemeToggle className="h-9 w-9 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-sm" />
                  <button
                    onClick={() => router.push(continueHref)}
                    className="group flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950"
                  >
                    {activeWork ? <PenTool className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {activeWork ? "继续写作" : "新建作品"}
                  </button>
                </div>
              </header>

              <section className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <ActiveWorkPanel
                    activeProgress={activeProgress}
                    activeWork={activeWork}
                    onCreate={() => router.push("/dashboard/create")}
                    onContinue={() => router.push(continueHref)}
                  />
                </div>
                <div className="min-w-0">
                  <StatsPanel stats={stats} />
                </div>
              </section>

              <div className="relative z-10">
                <DashboardWorksSection dashboard={dashboard} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {profileOpen && user && (
          <DashboardProfileModal
            user={user}
            onClose={() => setProfileOpen(false)}
            onUserUpdated={updateUser}
          />
        )}
      </AnimatePresence>

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
    </main>
  );
}

function ActiveWorkPanel({
  activeProgress,
  activeWork,
  onCreate,
  onContinue,
}: {
  activeProgress: ReturnType<typeof getProgressCopy> | null;
  activeWork: NonNullable<DashboardClientController["overview"]>["activeWork"] | null;
  onCreate: () => void;
  onContinue: () => void;
}) {
  if (!activeWork) {
    return (
      <div className="app-compact-panel flex h-full min-h-[170px] flex-col justify-between border-dashed p-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-zinc-200/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            等待开辟
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            空白的宇宙
          </h2>
          <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
            还没有任何进行中的故事。开启第一部作品，工作台会自动追踪进度与灵感。
          </p>
        </div>
        <button onClick={onCreate} className="group mt-4 inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950">
          <Plus className="h-4 w-4" />
          创建第一部作品
        </button>
      </div>
    );
  }

  const progressValue = activeProgress?.hasTarget ? activeProgress.percent : activeWork.completionPercent;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
  const chapterLine = getChapterLine(activeWork);

  return (
    <div className="app-compact-panel relative flex h-full min-h-[175px] flex-col justify-between overflow-hidden p-5">
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md bg-[var(--theme-brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
            活跃连载
          </div>
          <span className="text-xs font-bold text-[var(--theme-text-muted)]">
            {formatRelativeTime(activeWork.updatedAt)} 记录
          </span>
        </div>

        <h2 className="mt-4 truncate text-2xl font-extrabold leading-tight tracking-tight text-[var(--theme-text-strong)]" title={activeWork.title}>
          《{activeWork.title}》
        </h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-secondary)]">
          <BookOpen className="h-4 w-4 opacity-70" />
          <span className="truncate">{chapterLine}</span>
        </p>
      </div>

      <div className="relative z-10 mt-5">
        <div className="mb-2 flex justify-between text-xs font-bold text-[var(--theme-text-secondary)]">
          <span>{activeProgress?.label ?? "世界构建度"}</span>
          <span className="text-[var(--theme-brand-text)]">
            {activeProgress?.hasTarget ? activeProgress.value : `${normalizedProgress}%`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 shadow-inner dark:bg-zinc-800">
          <div className="h-full rounded-full bg-[var(--theme-brand-600)] transition-[width] duration-1000 ease-out" style={{ width: `${normalizedProgress}%` }} />
        </div>
      </div>

      <button
        onClick={onContinue}
        className="group absolute right-5 top-5 z-20 flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
      >
        进入 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}

function StatsPanel({ stats }: { stats: DashboardStat[] }) {
  return (
    <aside className="grid h-full gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {stats.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </aside>
  );
}

function StatCard({
  icon: Icon,
  label,
  tone,
  value,
}: DashboardStat) {
  const toneMap = {
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    neutral: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
    teal: "text-teal-600 dark:text-teal-400 bg-teal-500/10",
    sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  }[tone];

  return (
    <div className="app-compact-panel group flex min-h-[53px] items-center justify-between p-3">
      <div>
        <h4 className="text-[10px] font-bold tracking-widest text-[var(--theme-text-muted)] uppercase">
          {label}
        </h4>
        <div className="mt-1 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
          {value}
        </div>
      </div>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md transition-transform group-hover:scale-105", toneMap)}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

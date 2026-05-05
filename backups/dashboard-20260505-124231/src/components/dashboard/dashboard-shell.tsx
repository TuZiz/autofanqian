"use client";

import {
  BarChart3,
  BookOpen,
  Briefcase,
  Clock3,
  FileText,
  LogOut,
  PenLine,
  Plus,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardWorksSection } from "./dashboard-works-section";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import {
  getChapterLine,
  getEditorialTone,
  getProgressCopy,
  getTitleInitial,
} from "@/lib/dashboard/dashboard-visual";
import type { DashboardWork } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const { handleLogout, logoutBusy, overview, updateUser, user } = dashboard;
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const works = overview?.works ?? [];
  const activeWork = overview?.activeWork ?? null;
  const activeProgress = activeWork ? getProgressCopy(activeWork) : null;

  const continueHref = activeWork
    ? `/dashboard/novel/${activeWork.id}/chapter/${Math.max(1, activeWork.chapter.index)}`
    : "/dashboard/create";

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "创作者";

  const stats = useMemo(() => {
    const words = formatWordStat(overview?.stats.totalWords ?? 0);
    return [
      {
        helper: `${overview?.stats.chapterCount ?? 0} 章内容`,
        icon: FileText,
        label: "总字数",
        tone: "emerald" as const,
        value: `${words.value}${words.unit}`,
      },
      {
        helper: "累计章节",
        icon: BookOpen,
        label: "章节",
        tone: "amber" as const,
        value: `${overview?.stats.chapterCount ?? 0}`,
      },
      {
        helper: "当前书库",
        icon: Briefcase,
        label: "作品数",
        tone: "sky" as const,
        value: `${overview?.stats.workCount ?? 0}`,
      },
      {
        helper: activeWork ? "最近更新" : "暂无记录",
        icon: Clock3,
        label: "更新",
        tone: "violet" as const,
        value: activeWork ? formatRelativeTime(activeWork.updatedAt) : "暂无",
      },
    ];
  }, [activeWork, overview]);

  return (
    <main className="theme-page dashboard-no-radius dashboard-fit-viewport min-h-screen bg-[var(--theme-bg)] transition-[background-color,color] duration-300 lg:h-screen lg:overflow-hidden">
      <div className="dashboard-fit-layout flex min-h-screen flex-col lg:h-screen lg:flex-row">
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
          onProfileOpen={() => setProfileOpen(true)}
          recentWorks={works.slice(0, 4)}
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
            <div className="mx-auto w-full max-w-[1480px] space-y-4">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[28px] font-bold leading-tight text-[var(--theme-text-strong)]">
                    工作台
                  </h1>
                  <p className="mt-2 max-w-3xl truncate text-[14px] text-[var(--theme-text-muted)]">
                    {activeWork
                      ? `正在创作《${activeWork.title}》`
                      : "创建作品后，这里会显示你的写作入口和作品总览。"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <ThemeToggle className="h-11 w-11 border-[#eee9df] bg-white p-0 shadow-none dark:border-white/10 dark:bg-[#1c1917]" />
                  {activeWork ? (
                    <DashboardActionLink href={continueHref} variant="primary" className="h-11 px-5 text-[14px]">
                      <PenLine className="h-4 w-4" />
                      继续写作
                    </DashboardActionLink>
                  ) : (
                    <DashboardActionLink href="/dashboard/create" variant="primary" className="h-11 px-5 text-[14px]">
                      <Plus className="h-4 w-4" />
                      新建作品
                    </DashboardActionLink>
                  )}
                </div>
              </header>

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.68fr)] lg:items-stretch 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
                <ActiveWorkPanel
                  activeProgress={activeProgress}
                  activeWork={activeWork}
                />

                <StatsPanel stats={stats} />
              </section>

              <DashboardWorksSection dashboard={dashboard} />
            </div>
          </div>
        </section>
      </div>

      {profileOpen && user ? (
        <DashboardProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onUserUpdated={updateUser}
        />
      ) : null}

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

function DashboardSidebar({
  displayName,
  isAdmin,
  logoutBusy,
  onLogoutOpen,
  onProfileOpen,
  recentWorks,
}: {
  displayName: string;
  isAdmin: boolean;
  logoutBusy: boolean;
  onLogoutOpen: () => void;
  onProfileOpen: () => void;
  recentWorks: DashboardWork[];
}) {
  return (
    <aside className="border-b border-[#ebe7dd] bg-white transition-colors dark:border-white/10 dark:bg-[#151311] lg:flex lg:h-screen lg:w-[300px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r xl:w-[312px]">
      <div className="flex h-[78px] items-center justify-between px-5 lg:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#1c1917] text-white dark:bg-[#f5f5f4] dark:text-[#151311]">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="truncate text-[18px] font-bold text-[#1c1917] dark:text-[#f5f5f4]">
            我要当作者
          </span>
        </Link>

        <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={onProfileOpen}
              className="theme-icon-button inline-flex h-8 w-8 items-center justify-center rounded-xl p-0"
              aria-label="个人资料"
              title="个人资料"
            >
              <UserRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onLogoutOpen}
              disabled={logoutBusy}
              className="theme-icon-button inline-flex h-8 w-8 items-center justify-center rounded-xl p-0"
              aria-label="退出登录"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-5 py-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-5">
        <SidebarLink active href="/dashboard" icon={<BarChart3 className="h-[18px] w-[18px]" />}>
          工作台
        </SidebarLink>
        <SidebarLink href="/dashboard/create" icon={<Plus className="h-[18px] w-[18px]" />}>
          创建作品
        </SidebarLink>
        {isAdmin ? (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-[18px] w-[18px]" />}>
            管理后台
          </SidebarLink>
        ) : null}

        {recentWorks.length ? (
          <>
            <div className="mt-7 hidden items-center gap-2 px-3 text-[13px] font-medium text-[#77716a] dark:text-[#a8a29e] lg:flex">
              <Clock3 className="h-3.5 w-3.5" />
              最近打开
            </div>
            <div className="mt-3 hidden flex-col gap-3 lg:flex">
              {recentWorks.map((work) => (
                <RecentWorkLink key={work.id} work={work} />
              ))}
            </div>
          </>
        ) : null}
      </nav>

      <div className="hidden border-t border-[#f1eee6] p-6 dark:border-white/10 lg:block">
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={onProfileOpen}
            className="flex min-w-0 flex-1 items-center gap-3 px-0 py-0 text-left transition hover:text-[var(--theme-brand-600)]"
            aria-label="打开个人资料"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-[#eee9df] bg-[#fbfaf7] text-[17px] font-bold text-[#1c1917] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f5f5f4]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <span className="min-w-0 truncate text-[14px] font-medium text-[#77716a] dark:text-[#a8a29e]">
              {displayName}
            </span>
          </button>

          <button
            type="button"
            onClick={onLogoutOpen}
            disabled={logoutBusy}
            className="theme-icon-button inline-flex h-10 w-10 items-center justify-center border-[#eee9df] bg-white p-0 text-[#77716a] shadow-none hover:text-[var(--theme-danger-text)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#a8a29e]"
            aria-label="退出登录"
            title="退出登录"
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
        "relative inline-flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition",
        active
          ? "bg-[#e6f4ed] text-[#047857] dark:bg-[#063f32] dark:text-[#d1fae5]"
          : "text-[#77716a] hover:bg-[#f7f4ef] hover:text-[#1c1917] dark:text-[#a8a29e] dark:hover:bg-white/[0.06] dark:hover:text-[#f5f5f4]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 bg-[#10a37f]" />
      ) : null}
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function RecentWorkLink({ work }: { work: DashboardWork }) {
  const tone = getEditorialTone(`${work.id}:${work.title}`);

  return (
    <Link
      href={`/dashboard/novel/${work.id}`}
      className="flex min-w-0 items-center gap-3 px-3 py-0 transition hover:text-[var(--theme-brand-600)]"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-bold text-white shadow-sm"
        style={{ backgroundImage: tone.coverGradient }}
      >
        {getTitleInitial(work.title)}
      </div>
      <span className="truncate text-[14px] text-[#625b54] dark:text-[#d6d3d1]">{work.title}</span>
    </Link>
  );
}

function ActiveWorkPanel({
  activeProgress,
  activeWork,
}: {
  activeProgress: ReturnType<typeof getProgressCopy> | null;
  activeWork: NonNullable<DashboardClientController["overview"]>["activeWork"] | null;
}) {
  if (!activeWork) {
    return (
      <div className="flex min-h-[216px] flex-col justify-between overflow-hidden border border-[#cfeee3] bg-[#edf8f3] p-5 shadow-[0_24px_64px_-50px_rgba(28,25,23,0.22)] dark:border-[#115e4c]/70 dark:bg-[#0d2f27] dark:shadow-[0_24px_64px_-50px_rgba(0,0,0,0.8)] sm:p-6">
        <div>
          <span className="inline-flex items-center gap-2 border border-[#b9e6d7] bg-[#dcf4eb] px-3 py-1 text-[12px] font-bold text-[#047857] dark:border-[#10b981]/25 dark:bg-[#10b981]/10 dark:text-[#a7f3d0]">
            <span className="h-2 w-2 bg-[#10a37f]" />
            等待开稿
          </span>
          <h2 className="mt-5 max-w-2xl text-[22px] font-bold tracking-tight text-[var(--theme-text-strong)]">
            还没有进行中的作品
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-[var(--theme-text-secondary)]">
            先创建一部作品，工作台会自动汇总最近章节、进度、字数和作品列表。
          </p>
        </div>

        <DashboardActionLink href="/dashboard/create" variant="primary" className="mt-4 h-10 w-fit px-4 text-[13px]">
          <Plus className="h-4 w-4" />
          新建第一部作品
        </DashboardActionLink>
      </div>
    );
  }

  const progressValue = activeProgress?.hasTarget ? activeProgress.percent : activeWork.completionPercent;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
  const chapterLine = getChapterLine(activeWork);

  return (
    <div className="flex min-h-[216px] flex-col justify-between overflow-hidden border border-[#cfeee3] bg-[#edf8f3] p-5 shadow-[0_24px_64px_-50px_rgba(28,25,23,0.22)] dark:border-[#115e4c]/70 dark:bg-[#0d2f27] dark:shadow-[0_24px_64px_-50px_rgba(0,0,0,0.8)] sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 border border-[#b9e6d7] bg-[#dcf4eb] px-3 py-1 text-[12px] font-bold text-[#047857] dark:border-[#10b981]/25 dark:bg-[#10b981]/10 dark:text-[#a7f3d0]">
              <span className="h-2 w-2 bg-[#10a37f]" />
              写作中
            </span>
            <span className="text-[13px] text-[var(--theme-text-muted)]">
              {formatRelativeTime(activeWork.updatedAt)} 更新
            </span>
          </div>

          <h2 className="max-w-3xl truncate text-[24px] font-bold leading-tight tracking-tight text-[var(--theme-text-strong)]" title={activeWork.title}>
            《{activeWork.title}》
          </h2>
          <p className="mt-3 flex min-w-0 items-center gap-2.5 text-[14px] text-[var(--theme-text-secondary)]">
            <BookOpen className="h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" />
            <span className="truncate" title={chapterLine}>
              {chapterLine}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-[13px] font-medium">
          <span className="text-[var(--theme-text-muted)]">{activeProgress?.label ?? "全书完成度"}</span>
          <span className="text-[var(--theme-brand-600)]">
            {activeProgress?.hasTarget ? activeProgress.value : `${normalizedProgress}%`}
          </span>
        </div>
        <ProgressRail value={normalizedProgress} />
        {activeProgress?.hint ? (
          <p className="mt-2 truncate text-[11px] text-[var(--theme-text-muted)]" title={activeProgress.hint}>
            {activeProgress.hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type DashboardStat = {
  helper: string;
  icon: typeof FileText;
  label: string;
  tone: "amber" | "emerald" | "sky" | "violet";
  value: string;
};

function StatsPanel({ stats }: { stats: DashboardStat[] }) {
  return (
    <aside className="grid gap-3 sm:grid-cols-2">
      {stats.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </aside>
  );
}

function StatCard({
  helper,
  icon: Icon,
  label,
  tone,
  value,
}: DashboardStat) {
  const toneClassName = {
    amber: "bg-[#fff6df] text-[#b56b09] dark:bg-[#f59e0b]/10 dark:text-[#fcd34d]",
    emerald: "bg-[#e3f6ed] text-[#047857] dark:bg-[#10b981]/10 dark:text-[#a7f3d0]",
    sky: "bg-[#e4f6ee] text-[#047857] dark:bg-[#14b8a6]/10 dark:text-[#99f6e4]",
    violet: "bg-[#f6f3ee] text-[#6f6962] dark:bg-white/[0.06] dark:text-[#d6d3d1]",
  }[tone];

  return (
    <div
      title={helper}
      className="relative flex min-h-[102px] flex-col justify-between border border-[#f0ece4] bg-white p-4 shadow-[0_22px_60px_-52px_rgba(28,25,23,0.2)] dark:border-white/10 dark:bg-[#1c1917] dark:shadow-[0_22px_60px_-52px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[14px] font-medium text-[var(--theme-text-muted)]">{label}</div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center", toneClassName)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="truncate text-[25px] font-bold leading-none text-[var(--theme-text-strong)]">{value}</div>
    </div>
  );
}

function DashboardActionLink({
  children,
  className,
  href,
  variant,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  variant: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 px-4 text-[13px] font-bold transition active:scale-[0.99] focus-visible:outline-none",
        variant === "primary" ? "theme-button-primary" : "theme-button-secondary",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function ProgressRail({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className="relative h-2 w-full bg-white dark:bg-[#151311]">
      {width > 0 ? (
        <div
          className="h-full bg-[var(--theme-brand-500)] transition-[width] duration-300"
          style={{ width: `${width}%` }}
        />
      ) : null}
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 bg-[var(--theme-brand-600)] ring-4 ring-[#edf8f3] dark:ring-[#0d2f27]"
        style={{ left: `${Math.max(0, Math.min(100, width))}%` }}
      />
    </div>
  );
}

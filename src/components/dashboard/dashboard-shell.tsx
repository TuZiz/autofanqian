"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { 
  Plus, BookOpen, Layers, LayoutGrid, 
  LogOut, Sparkles, PenTool, ArrowRight,
  Shield
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutConfirmDialog } from "@/components/ui/logout-confirm-dialog";
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
import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardWorksSection } from "./dashboard-works-section";

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

import type { LucideIcon } from "lucide-react";

type DashboardStat = {
  icon: LucideIcon;
  label: string;
  tone: "amber" | "emerald" | "neutral" | "teal" | "blue" | "purple";
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
        tone: "blue",
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
        tone: "purple",
        value: `${overview?.stats.workCount ?? 0}`,
      },
    ];
  }, [activeWork, overview]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 selection:bg-blue-200/50 dark:selection:bg-blue-500/30 font-sans transition-colors duration-500">
      <div className="flex h-screen overflow-hidden">
        
        {/* 悬浮侧边栏 */}
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onCreate={() => router.push("/dashboard/create")}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
          onProfileOpen={() => setProfileOpen(true)}
          recentWorks={works.slice(0, 4)}
        />

        {/* 右侧主内容区 */}
        <section className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative">
          
          {/* 背景光晕和网格 */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute -left-[10%] top-[10%] h-[40%] w-[40%] rounded-full bg-blue-400/10 blur-[120px] mix-blend-multiply dark:bg-blue-500/10" />
            <div className="absolute right-[10%] top-[30%] h-[30%] w-[30%] rounded-full bg-purple-400/10 blur-[120px] mix-blend-multiply dark:bg-purple-500/10" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay dark:opacity-[0.03]" />

          <div className="relative z-10 mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-col gap-10">
              {/* 顶栏与欢迎区 */}
              <header className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    <span>Creator Cockpit</span>
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-5xl lg:text-[56px]">
                    工作台
                  </h1>
                  <p className="mt-4 max-w-2xl text-base font-bold leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg">
                    {activeWork
                      ? `欢迎回来。您正在构建《${activeWork.title}》的世界。`
                      : "欢迎回来。创建一个新故事，开启今天的旅程。"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <ThemeToggle className="h-12 w-12 rounded-[16px] border border-zinc-200/80 bg-white/80 shadow-sm backdrop-blur-xl transition-all hover:bg-zinc-50 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:hover:bg-zinc-900" />
                  <button
                    onClick={() => router.push(continueHref)}
                    className="group flex h-12 items-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-bold text-white shadow-lg shadow-zinc-950/20 transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:bg-zinc-200"
                  >
                    {activeWork ? <PenTool className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {activeWork ? "继续写作" : "新建作品"}
                  </button>
                </div>
              </header>

              {/* Hero 数据与活动项卡片区 */}
              <section className="relative z-10 grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 xl:col-span-8">
                  <ActiveWorkPanel
                    activeProgress={activeProgress}
                    activeWork={activeWork}
                    onCreate={() => router.push("/dashboard/create")}
                    onContinue={() => router.push(continueHref)}
                  />
                </div>
                <div className="lg:col-span-4 xl:col-span-4">
                  <StatsPanel stats={stats} />
                </div>
              </section>

              {/* 作品列表区 */}
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

function DashboardSidebar({
  displayName,
  isAdmin,
  logoutBusy,
  onCreate,
  onLogoutOpen,
  onProfileOpen,
  recentWorks,
}: {
  displayName: string;
  isAdmin: boolean;
  logoutBusy: boolean;
  onCreate: () => void;
  onLogoutOpen: () => void;
  onProfileOpen: () => void;
  recentWorks: DashboardWork[];
}) {
  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-r border-zinc-200/50 bg-white/40 p-6 backdrop-blur-3xl dark:border-zinc-800/50 dark:bg-zinc-950/40">
      
      {/* 侧栏顶端 Logo 区 */}
      <div className="flex items-center gap-4 mb-10 pl-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 dark:bg-white dark:text-zinc-950 dark:shadow-white/10">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">我要当作者</h2>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2.5">
        <SidebarLink active href="/dashboard" icon={<LayoutGrid className="h-5 w-5" />}>
          控制台
        </SidebarLink>
        <button
          type="button"
          onClick={onCreate}
          className="group flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-bold text-zinc-600 transition-all hover:bg-white hover:text-zinc-950 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
          新建作品
        </button>
        {isAdmin && (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-5 w-5" />}>
            管理系统
          </SidebarLink>
        )}

        {recentWorks.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 px-4 text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase dark:text-zinc-400">
              近期宇宙
            </h3>
            <div className="flex flex-col gap-1.5">
              {recentWorks.map((work) => (
                <RecentWorkLink key={work.id} work={work} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 底部个人信息卡片 */}
      <div className="mt-6 rounded-[24px] border border-white/60 bg-white/70 p-2 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onProfileOpen}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] p-2 transition-colors hover:bg-white dark:hover:bg-zinc-800/80"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-blue-50 text-base font-black text-blue-600 shadow-inner ring-1 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-black text-zinc-950 dark:text-white">{displayName}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">作者设置</div>
            </div>
          </button>
          <button
            type="button"
            disabled={logoutBusy}
            onClick={onLogoutOpen}
            className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100/80 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800/80 dark:hover:bg-red-500/10 dark:hover:text-red-400"
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
        "flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-bold no-underline transition-all",
        active
          ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 dark:bg-white dark:text-zinc-950 dark:shadow-white/10"
          : "text-zinc-600 hover:bg-white hover:text-zinc-950 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white",
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
      className="group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white dark:hover:bg-zinc-900"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
        style={{ backgroundImage: tone.coverGradient }}
      >
        {getTitleInitial(work.title)}
      </span>
      <div className="min-w-0">
        <span className="block truncate text-sm font-black text-zinc-700 transition-colors group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white">
          {work.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {formatRelativeTime(work.updatedAt)}
        </span>
      </div>
    </Link>
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
      <div className="flex h-full min-h-[300px] flex-col justify-between rounded-[32px] border border-dashed border-zinc-300/80 bg-zinc-50/50 p-8 shadow-inner backdrop-blur-xl transition-all dark:border-zinc-700/80 dark:bg-zinc-900/50 sm:p-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-200/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            等待开辟
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            空白的宇宙
          </h2>
          <p className="mt-4 max-w-lg text-sm font-bold leading-relaxed text-zinc-500 dark:text-zinc-400">
            还没有任何进行中的故事。开启第一部作品，工作台会自动追踪进度与灵感。
          </p>
        </div>
        <button onClick={onCreate} className="group mt-8 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
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
    <div className="relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-900 p-8 shadow-2xl shadow-blue-900/20 text-white">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/30 blur-[80px]" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-md ring-1 ring-white/30">
            活跃连载
          </div>
          <span className="text-sm font-bold text-white/70">
            {formatRelativeTime(activeWork.updatedAt)} 记录
          </span>
        </div>

        <h2 className="mt-6 truncate text-4xl sm:text-5xl font-black leading-tight tracking-tight drop-shadow-sm" title={activeWork.title}>
          《{activeWork.title}》
        </h2>
        <p className="mt-3 flex items-center gap-2 text-base font-medium text-blue-100">
          <BookOpen className="h-5 w-5 opacity-70" />
          <span className="truncate">{chapterLine}</span>
        </p>
      </div>

      <div className="relative z-10 mt-10">
        <div className="mb-3 flex justify-between text-sm font-bold text-blue-100">
          <span>{activeProgress?.label ?? "世界构建度"}</span>
          <span className="text-white">
            {activeProgress?.hasTarget ? activeProgress.value : `${normalizedProgress}%`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/20 shadow-inner">
          <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out" style={{ width: `${normalizedProgress}%` }} />
        </div>
      </div>

      <button
        onClick={onContinue}
        className="group absolute right-8 top-8 flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 font-black text-white backdrop-blur-xl ring-1 ring-white/30 transition-all hover:scale-105 hover:bg-white hover:text-blue-900 z-20"
      >
        进入 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}

function StatsPanel({ stats }: { stats: DashboardStat[] }) {
  return (
    <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 h-full">
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
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  }[tone];

  return (
    <div className="group flex min-h-[110px] items-center justify-between rounded-[28px] bg-white/60 p-6 shadow-sm ring-1 ring-zinc-900/5 transition-all hover:bg-white hover:shadow-lg dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 backdrop-blur-xl">
      <div>
        <h4 className="text-xs font-black tracking-widest text-zinc-400 uppercase">
          {label}
        </h4>
        <div className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          {value}
        </div>
      </div>
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-[20px] transition-transform group-hover:scale-110", toneMap)}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

"use client";

import { Avatar, Button, Card, Chip, ProgressBar } from "@heroui/react";
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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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

type DashboardStat = {
  helper: string;
  icon: LucideIcon;
  label: string;
  tone: "amber" | "emerald" | "sky" | "violet";
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
        helper: `${overview?.stats.chapterCount ?? 0} 章内容`,
        icon: FileText,
        label: "总字数",
        tone: "emerald",
        value: `${words.value}${words.unit}`,
      },
      {
        helper: "累计章节",
        icon: BookOpen,
        label: "章节",
        tone: "amber",
        value: `${overview?.stats.chapterCount ?? 0}`,
      },
      {
        helper: "当前书库",
        icon: Briefcase,
        label: "作品数",
        tone: "sky",
        value: `${overview?.stats.workCount ?? 0}`,
      },
      {
        helper: activeWork ? "最近更新" : "暂无记录",
        icon: Clock3,
        label: "更新",
        tone: "violet",
        value: activeWork ? formatRelativeTime(activeWork.updatedAt) : "暂无",
      },
    ];
  }, [activeWork, overview]);

  return (
    <main className="dashboard-desktop-fit min-h-screen bg-[#f7f4ee] text-stone-950 transition-colors dark:bg-[#11100f] dark:text-stone-50 lg:h-screen lg:overflow-hidden">
      <div className="dashboard-desktop-scale grid min-h-screen lg:h-screen lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]">
        <DashboardSidebar
          displayName={displayName}
          isAdmin={Boolean(user?.isAdmin)}
          logoutBusy={logoutBusy}
          onCreate={() => router.push("/dashboard/create")}
          onLogoutOpen={() => setLogoutConfirmOpen(true)}
          onProfileOpen={() => setProfileOpen(true)}
          recentWorks={works.slice(0, 4)}
        />

        <section className="min-h-0 overflow-y-auto px-4 py-3 sm:px-5 lg:px-5 xl:px-6">
          <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-3">
            <header className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Novel cockpit
                </div>
                <h1 className="mt-1 text-[28px] font-black leading-none tracking-tight sm:text-[32px]">
                  工作台
                </h1>
                <p className="mt-1.5 max-w-3xl truncate text-[13px] font-medium text-stone-500 dark:text-stone-400">
                  {activeWork
                    ? `正在创作《${activeWork.title}》`
                    : "创建作品后，这里会显示你的写作入口和作品总览。"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle className="h-9 w-9 rounded-xl border border-stone-200 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-white/[0.06]" />
                <Button
                  size="lg"
                  variant="primary"
                  onPress={() => router.push(continueHref)}
                  className="h-9 rounded-xl bg-stone-950 px-4 text-sm font-black text-white shadow-sm dark:bg-stone-50 dark:text-stone-950"
                >
                  {activeWork ? <PenLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {activeWork ? "继续写作" : "新建作品"}
                </Button>
              </div>
            </header>

            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.82fr)] xl:grid-cols-[minmax(0,1.55fr)_minmax(350px,0.82fr)]">
              <ActiveWorkPanel
                activeProgress={activeProgress}
                activeWork={activeWork}
                onCreate={() => router.push("/dashboard/create")}
                onContinue={() => router.push(continueHref)}
              />
              <StatsPanel stats={stats} />
            </section>

            <DashboardWorksSection dashboard={dashboard} />
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
    <aside className="flex min-h-0 flex-col border-b border-stone-200/80 bg-white/86 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#171514]/90 lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-1 py-1.5">
        <Avatar className="h-10 w-10 rounded-2xl bg-stone-950 text-white dark:bg-stone-50 dark:text-stone-950">
          <Avatar.Fallback>
            <Sparkles className="h-5 w-5" />
          </Avatar.Fallback>
        </Avatar>
        <Link href="/dashboard" className="min-w-0">
          <div className="truncate text-[18px] font-black tracking-tight">我要当作者</div>
          <div className="truncate text-xs font-bold text-stone-500 dark:text-stone-400">
            创作中枢
          </div>
        </Link>
      </div>

      <nav className="mt-4 flex gap-1.5 overflow-x-auto lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto">
        <SidebarLink active href="/dashboard" icon={<BarChart3 className="h-4 w-4" />}>
          工作台
        </SidebarLink>
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-9 items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          <Plus className="h-4 w-4" />
          创建作品
        </button>
        {isAdmin ? (
          <SidebarLink href="/dashboard/admin" icon={<Shield className="h-4 w-4" />}>
            管理后台
          </SidebarLink>
        ) : null}

        {recentWorks.length ? (
          <div className="hidden lg:block">
            <div className="mb-2 mt-6 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
              <Clock3 className="h-3.5 w-3.5" />
              最近打开
            </div>
            <div className="space-y-2">
              {recentWorks.map((work) => (
                <RecentWorkLink key={work.id} work={work} />
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <Card variant="secondary" className="mt-3 hidden rounded-2xl border border-stone-200 bg-stone-50/80 shadow-none dark:border-white/10 dark:bg-white/[0.04] lg:block">
        <Card.Content className="flex items-center justify-between gap-3 p-2.5">
          <button
            type="button"
            onClick={onProfileOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Avatar className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Avatar.Fallback>{displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{displayName}</span>
              <span className="block text-xs font-bold text-stone-500 dark:text-stone-400">
                个人资料
              </span>
            </span>
          </button>

          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            isDisabled={logoutBusy}
            onPress={onLogoutOpen}
            className="rounded-xl text-stone-500 hover:text-red-600 dark:text-stone-300 dark:hover:text-red-300"
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </Card.Content>
      </Card>
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
        "flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
        active
          ? "bg-emerald-100 text-emerald-800 shadow-sm dark:bg-emerald-400/12 dark:text-emerald-200"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.06] dark:hover:text-white",
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
      className="group flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white dark:hover:bg-white/[0.06]"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white shadow-sm"
        style={{ backgroundImage: tone.coverGradient }}
      >
        {getTitleInitial(work.title)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-stone-700 group-hover:text-stone-950 dark:text-stone-300 dark:group-hover:text-white">
          {work.title}
        </span>
        <span className="block truncate text-xs text-stone-400">
          {formatRelativeTime(work.updatedAt)}
        </span>
      </span>
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
      <Card className="min-h-[198px] rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/8">
        <Card.Content className="flex h-full flex-col justify-between gap-4 p-4">
          <div>
            <Chip color="success" size="sm" variant="soft">
              等待开稿
            </Chip>
            <h2 className="mt-4 text-[24px] font-black tracking-tight">
              还没有进行中的作品
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] font-medium leading-5 text-stone-600 dark:text-stone-300">
              先创建一部作品，工作台会自动汇总最近章节、进度、字数和作品列表。
            </p>
          </div>
          <Button
            size="lg"
            variant="primary"
            onPress={onCreate}
            className="h-9 w-fit rounded-xl bg-stone-950 px-4 font-black text-white dark:bg-stone-50 dark:text-stone-950"
          >
            <Plus className="h-4 w-4" />
            新建第一部作品
          </Button>
        </Card.Content>
      </Card>
    );
  }

  const progressValue = activeProgress?.hasTarget ? activeProgress.percent : activeWork.completionPercent;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
  const chapterLine = getChapterLine(activeWork);

  return (
    <Card className="relative min-h-[198px] overflow-hidden rounded-3xl border border-emerald-200 bg-[#eaf8f2] shadow-sm dark:border-emerald-400/20 dark:bg-[#0d2f27]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.16),transparent_60%)]" />
      <Card.Content className="relative flex h-full flex-col justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip color="success" size="sm" variant="soft">
              写作中
            </Chip>
            <span className="text-[13px] font-bold text-stone-500 dark:text-stone-400">
              {formatRelativeTime(activeWork.updatedAt)} 更新
            </span>
          </div>

          <h2 className="mt-4 truncate text-[24px] font-black leading-tight tracking-tight" title={activeWork.title}>
            《{activeWork.title}》
          </h2>
          <p className="mt-2.5 flex min-w-0 items-center gap-2 text-[13px] font-bold text-stone-600 dark:text-stone-300">
            <BookOpen className="h-4 w-4 shrink-0 text-stone-500" />
            <span className="truncate" title={chapterLine}>
              {chapterLine}
            </span>
          </p>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs font-black text-stone-500 dark:text-stone-400">
            <span>{activeProgress?.label ?? "全书完成度"}</span>
            <span className="text-emerald-700 dark:text-emerald-300">
              {activeProgress?.hasTarget ? activeProgress.value : `${normalizedProgress}%`}
            </span>
          </div>
          <ProgressBar
            aria-label={activeProgress?.label ?? "全书完成度"}
            color="success"
            maxValue={100}
            minValue={0}
            size="sm"
            value={normalizedProgress}
          >
            <ProgressBar.Track className="h-2 rounded-full bg-white/82 dark:bg-black/20">
              <ProgressBar.Fill className="rounded-full bg-emerald-600 dark:bg-emerald-300" />
            </ProgressBar.Track>
          </ProgressBar>
          {activeProgress?.hint ? (
            <p className="mt-1.5 truncate text-xs font-medium text-stone-500 dark:text-stone-400" title={activeProgress.hint}>
              {activeProgress.hint}
            </p>
          ) : null}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onPress={onContinue}
          className="absolute right-4 top-4 h-8 rounded-xl bg-white/88 px-3 text-xs font-black text-stone-900 shadow-sm dark:bg-white/[0.08] dark:text-white"
        >
          <PenLine className="h-4 w-4" />
          打开章节
        </Button>
      </Card.Content>
    </Card>
  );
}

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
  icon: Icon,
  label,
  tone,
  value,
}: DashboardStat) {
  const toneClassName = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
    sky: "bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-200",
    violet: "bg-stone-100 text-stone-600 dark:bg-white/[0.08] dark:text-stone-200",
  }[tone];

  return (
    <Card className="min-h-[94px] rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#191715]">
      <Card.Content className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[13px] font-black text-stone-500 dark:text-stone-400">{label}</span>
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", toneClassName)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="truncate text-[26px] font-black leading-none tracking-tight">{value}</div>
      </Card.Content>
    </Card>
  );
}

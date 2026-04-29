"use client";

import { Activity, FileText, LogOut, PenLine, Plus, Shield, Sparkles, Upload, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { formatRelativeTime, formatWordStat } from "@/lib/dashboard/dashboard-format";
import type { DashboardOverview } from "@/lib/dashboard/dashboard-types";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";
import { zhCN } from "@/lib/copy/zh-cn";

import { DashboardProfileModal } from "./dashboard-profile-modal";
import { DashboardWorksSection } from "./dashboard-works-section";

type WorkspaceStat = {
  title: string;
  value: string;
  footer: string;
  icon: LucideIcon;
  unit?: string;
  footerTone: "trend" | "muted";
};

type DashboardShellProps = {
  dashboard: DashboardClientController;
};

const cardClassName =
  "relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900";

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const { handleLogout, logoutBusy, overview, updateUser, user } = dashboard;
  const [profileOpen, setProfileOpen] = useState(false);
  const displayUserId = user?.code ? String(user.code) : "-";
  const profileLabel = user?.name?.trim() || user?.email || "个人信息";
  const activeWork = overview?.activeWork ?? null;
  const activeChapterLine = activeWork
    ? activeWork.chapter.wordCount > 0
      ? `第 ${activeWork.chapter.index} 章：${activeWork.chapter.title || "未命名章节"}`
      : "还没有开始正文"
    : "创建作品后会在这里显示最近进度";
  const activeCompletion = Math.max(0, Math.min(100, activeWork?.completionPercent ?? 0));
  const continueHref = activeWork
    ? `/dashboard/work/${activeWork.id}/chapter/${Math.max(1, activeWork.chapter.index)}`
    : "/dashboard/create";

  const workspaceStats = useMemo<WorkspaceStat[]>(() => {
    const words = formatWordStat(overview?.stats.totalWords ?? 0);
    const workCount = overview?.stats.workCount ?? 0;
    const chapterCount = overview?.stats.chapterCount ?? 0;

    return [
      {
        title: "总字数",
        value: words.value,
        unit: words.unit,
        footer: workCount ? `来自 ${workCount} 部作品` : "开始创作后自动统计",
        icon: Activity,
        footerTone: "muted",
      },
      {
        title: "累计章节",
        value: String(chapterCount),
        unit: "章",
        footer: workCount ? `分布在 ${workCount} 部作品中` : "还没有真实章节记录",
        icon: FileText,
        footerTone: "muted",
      },
    ];
  }, [overview]);

  return (
    <main className="theme-page relative min-h-screen overflow-hidden bg-[#f5f6f2] transition-[background-color,color] dark:bg-[#0d1117]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <div className="relative z-10 flex min-h-screen w-full items-start justify-center px-6 py-10 lg:py-14">
        <div className="w-full max-w-[1200px] space-y-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 shadow-sm dark:bg-white">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)] dark:text-white">
                  {zhCN.app.shortName}
                </h1>
                <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--theme-text-secondary)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  专业
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="inline-flex h-9 max-w-[280px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-[var(--theme-text-secondary)] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                aria-label="查看个人信息"
                title="查看个人信息"
              >
                <UserRound className="h-4 w-4 shrink-0 opacity-80" />
                <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
                  <span className="max-w-[18ch] truncate">{profileLabel}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ID {displayUserId}</span>
                </span>
              </button>
              {user?.isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <Shield className="h-4 w-4" />
                  管理员
                </Link>
              ) : (
                <MembershipPill />
              )}
              <ThemeToggle className="h-9 w-9 rounded-md border border-slate-200 bg-white text-[var(--theme-text-secondary)] shadow-none hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900" />
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutBusy}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-[var(--theme-text-strong)] shadow-none transition hover:bg-slate-50 disabled:opacity-70 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                aria-label="退出登录"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:auto-rows-[200px] lg:grid-cols-4">
            <HeroCard />
            <ActiveWorkCard
              activeChapterLine={activeChapterLine}
              activeCompletion={activeCompletion}
              activeWork={activeWork}
              continueHref={continueHref}
            />
            {workspaceStats.map((stat) => (
              <StatCard key={stat.title} stat={stat} />
            ))}
          </div>

          <DashboardWorksSection dashboard={dashboard} />
        </div>
      </div>

      {profileOpen && user ? (
        <DashboardProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onUserUpdated={updateUser}
        />
      ) : null}
    </main>
  );
}

function MembershipPill() {
  return (
    <div
      className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      aria-label="会员等级（预留）"
      title="会员等级（预留）"
    >
      <span className="rounded bg-slate-950 px-3 py-1 text-white dark:bg-white dark:text-slate-950">基础</span>
      <span className="rounded px-3 py-1 text-slate-500 dark:text-slate-400">进阶</span>
      <span className="rounded px-3 py-1 text-slate-500 dark:text-slate-400">专业</span>
    </div>
  );
}

function HeroCard() {
  return (
    <section
      className={`${cardClassName} lg:col-span-2 lg:row-span-2`}
    >
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            Creative Cockpit
          </div>
          <h2 className="text-[clamp(2rem,3vw,2.6rem)] font-black leading-tight tracking-tight text-slate-950 dark:text-white">
            创作驾驶舱已就绪
          </h2>
          <p className="mt-4 max-w-[88%] text-[1rem] font-medium leading-7 text-slate-600 dark:text-slate-300">
            从创意、设定、分卷到正文续写，所有长期写作动作都集中在同一套工作台语言里。
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <HeroLink href="/dashboard/create" icon={Plus} label="新建灵感草稿" primary />
          <HeroLink href="/dashboard/import" icon={Upload} label="导入本地作品" badge="预留" />
        </div>
      </div>
    </section>
  );
}

function HeroLink({
  href,
  icon: Icon,
  label,
  badge,
  primary = false,
}: {
  badge?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        primary ? "theme-button-primary" : "theme-button-secondary",
        "inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-semibold active:scale-[0.98] sm:flex-1",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {badge ? (
        <span className="rounded-md border border-current/20 px-2 py-0.5 text-[11px] font-bold opacity-75">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

type ActiveWorkCardProps = {
  activeChapterLine: string;
  activeCompletion: number;
  activeWork: DashboardOverview["activeWork"];
  continueHref: string;
};

function ActiveWorkCard({ activeChapterLine, activeCompletion, activeWork, continueHref }: ActiveWorkCardProps) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-[color:var(--theme-border)] bg-white p-4 text-slate-950 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:border-slate-700 dark:hover:bg-slate-900 lg:col-span-2">
      <div className="grid h-full min-h-[168px] grid-rows-[auto_1fr_auto] gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="theme-chip inline-flex h-7 w-max shrink-0 items-center rounded-md px-2.5 text-[11px] font-bold shadow-none">
              ● {activeWork ? "写作中" : "待开写"}
            </span>
            {activeWork ? (
              <span className="theme-muted truncate text-xs font-semibold">
                {formatRelativeTime(activeWork.updatedAt)}更新
              </span>
            ) : null}
          </div>
          <Link
            href={continueHref}
            className="theme-button-primary inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-bold shadow-none active:scale-95"
          >
            <PenLine className="h-4 w-4" />
            {activeWork ? "继续写作" : "开始写作"}
          </Link>
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            当前作品
          </div>
          <h3 className="theme-heading mt-1 truncate text-[1.35rem] font-black leading-tight tracking-normal sm:text-[1.6rem]">
            {activeWork ? `《${activeWork.title}》` : "暂无进行中的作品"}
          </h3>
          <div className="theme-subheading mt-2 text-sm font-semibold leading-6">
            <span className="block min-w-0 truncate">{activeChapterLine}</span>
          </div>
        </div>

        <div>
          <div className="theme-muted flex items-center justify-between text-xs font-bold">
            <span>全书完成度</span>
            <span className="theme-heading text-sm font-black">{activeCompletion}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--theme-divider)]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${activeCompletion}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat }: { stat: WorkspaceStat }) {
  const Icon = stat.icon;

  return (
    <article className={cardClassName}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-600 dark:text-zinc-400">{stat.title}</div>
          <Icon className="h-[18px] w-[18px] text-slate-400 dark:text-zinc-500" />
        </div>
        <div className="mt-5 flex items-end gap-1">
          <span className="text-[3rem] font-extrabold leading-none tracking-tight text-slate-950 dark:text-white">
            {stat.value}
          </span>
          {stat.unit ? (
            <span className="pb-1 text-lg font-semibold leading-none text-slate-500 dark:text-zinc-400">
              {stat.unit}
            </span>
          ) : null}
        </div>
        {stat.footerTone === "trend" ? (
          <div className="mt-5 inline-flex w-max items-center rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {stat.footer}
          </div>
        ) : (
          <div className="mt-5 text-sm text-slate-600 dark:text-zinc-400">{stat.footer}</div>
        )}
      </div>
    </article>
  );
}

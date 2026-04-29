"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

import { AdminConfigSection } from "./admin-config-section";
import { AdminStatsSection } from "./admin-stats-section";
import { AdminTemplateSection } from "./admin-template-section";

type DashboardAdminViewProps = {
  admin: DashboardAdminController;
};

export function DashboardAdminView({ admin }: DashboardAdminViewProps) {
  const activeGenres = admin.config?.genres.filter((genre) => genre.active).length ?? 0;
  const totalGenres = admin.config?.genres.length ?? 0;
  const activePlatforms = admin.config?.platforms.filter((item) => item.active).length ?? 0;
  const totalOptions =
    (admin.config?.platforms.length ?? 0) +
    (admin.config?.dnaStyles.length ?? 0) +
    (admin.config?.wordOptions.length ?? 0);

  return (
    <main className="theme-page relative min-h-screen overflow-x-hidden pb-10 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <div className="pointer-events-none fixed inset-0 theme-app-grid opacity-70" />
      <div className="pointer-events-none fixed inset-0 theme-app-vignette" />
      <div className="pointer-events-none fixed inset-0 app-noise theme-app-noise" />

      <DashboardTopbar
        className="relative z-40"
        title="管理员控制台"
        userEmail={admin.user?.email ?? ""}
        isAdmin={admin.user?.isAdmin}
        showBackToDashboard
        showAdminLink={false}
        logoutLabel="退出"
        maxWidthClassName="max-w-[1540px]"
      />

      <div className="relative z-10 mx-auto max-w-[1540px] px-4 pt-4 sm:px-5 lg:px-6">
        <section className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950">
          <div className="grid gap-4 border-b border-slate-100 p-4 dark:border-white/10 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.72fr)] xl:items-center">
            <div className="min-w-0 text-slate-950 dark:text-slate-50">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                Admin Workbench
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black leading-tight tracking-tight md:text-3xl">总览与配置</h1>
                <AdminAutoSaveStatus admin={admin} />
              </div>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                核心数据、创作入口参数、AI 模板学习和后台入口集中管理。重要状态保留在首屏，保存动作交给自动保存。
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <AdminSummary label="类型卡片" value={`${activeGenres}/${totalGenres}`} detail="启用 / 全部" />
              <AdminSummary label="目标平台" value={`${activePlatforms}`} detail="当前启用平台" />
              <AdminSummary label="参数选项" value={`${totalOptions}`} detail="平台 / DNA / 字数" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <AdminLink href="/dashboard/admin/users" icon={Users}>
              用户管理
            </AdminLink>
            <AdminLink href="/dashboard/admin/ai-model" icon={Bot}>
              AI 模型配置
            </AdminLink>
            <AdminLink href="/dashboard/create" icon={Eye}>
              预览创作页
            </AdminLink>
          </div>
        </section>

        <AdminStatsSection admin={admin} />
        <AdminConfigSection admin={admin} />
        <AdminTemplateSection admin={admin} />
      </div>
    </main>
  );
}

function AdminSummary({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <div className="truncate text-xs font-black text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-0.5 truncate text-[11px] font-bold text-slate-400 dark:text-slate-500">{detail}</div>
      </div>
      <div className="shrink-0 text-2xl font-black text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  );
}

function AdminLink({
  children,
  href,
  icon: Icon,
}: {
  children: React.ReactNode;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="theme-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black active:scale-95"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function AdminAutoSaveStatus({ admin }: { admin: DashboardAdminController }) {
  const stateMeta = {
    idle: {
      icon: Clock3,
      text: "等待配置加载",
      className: "text-slate-500",
    },
    dirty: {
      icon: Clock3,
      text: "待自动保存",
      className: "text-amber-700 dark:text-amber-200",
    },
    saving: {
      icon: Loader2,
      text: "自动保存中",
      className: "text-sky-700 dark:text-sky-200",
    },
    saved: {
      icon: CheckCircle2,
      text: "已自动保存",
      className: "text-emerald-700 dark:text-emerald-200",
    },
    error: {
      icon: AlertCircle,
      text: admin.configSaveError || "自动保存失败",
      className: "text-rose-700 dark:text-rose-200",
    },
  }[admin.configSaveState];
  const Icon = stateMeta.icon;

  return (
    <div
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-black shadow-sm dark:border-white/10 dark:bg-white/5 ${stateMeta.className}`}
    >
      <Icon className={admin.configSaveState === "saving" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      <span className="truncate">{stateMeta.text}</span>
      {admin.configLastSavedAt ? (
        <span className="hidden text-[11px] font-bold text-slate-400 sm:inline">
          {admin.configLastSavedAt.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : null}
    </div>
  );
}

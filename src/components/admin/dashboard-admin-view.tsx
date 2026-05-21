"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  DatabaseZap,
  Eye,
  FileText,
  Loader2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppCard } from "@/components/app-ui";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

import { AdminAuditSection } from "./admin-audit-section";
import { AdminConfigSection } from "./admin-config-section";
import { AdminPlanningSection } from "./admin-planning-section";
import { AdminStatsSection } from "./admin-stats-section";
import { AdminTemplateSection } from "./admin-template-section";
import { AdminVersionPopover } from "./admin-version-popover";

type DashboardAdminViewProps = {
  admin: DashboardAdminController;
};

export function DashboardAdminView({ admin }: DashboardAdminViewProps) {
  const activeGenres = admin.config?.genres.filter((genre) => genre.active).length ?? 0;
  const totalGenres = admin.config?.genres.length ?? 0;
  const activePlatforms = admin.config?.platforms.filter((item) => item.active).length ?? 0;
  const canUpdateSystem = Boolean(admin.user?.isRootAdmin || admin.user?.role === "super_admin");
  const totalOptions =
    (admin.config?.platforms.length ?? 0) +
    (admin.config?.dnaStyles.length ?? 0) +
    (admin.config?.wordOptions.length ?? 0);

  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />

      <DashboardTopbar
        className="relative z-40"
        title="管理员控制台"
        userEmail={admin.user?.email ?? ""}
        isAdmin={admin.user?.isAdmin}
        showBackToDashboard
        showAdminLink={false}
        logoutLabel="退出"
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <AppCard className="mb-3 overflow-hidden bg-[var(--theme-surface-strong)]">
          <div className="grid gap-4 border-b border-stone-100 p-4 dark:border-white/8 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.72fr)] xl:items-center">
            <div className="min-w-0 text-stone-900 dark:text-stone-100">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                管理控制台
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--theme-text-strong)]">总览与配置</h1>
                <AdminVersionPopover canUpdate={canUpdateSystem} />
                <AdminAutoSaveStatus admin={admin} />
              </div>
              <p className="mt-1 max-w-3xl truncate text-sm font-semibold text-[var(--theme-text-secondary)]">
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
            <AdminLink href="/dashboard/admin/prompts" icon={FileText}>
              提示词模板
            </AdminLink>
            <AdminLink href="/dashboard/admin/jobs" icon={DatabaseZap}>
              后台任务
            </AdminLink>
            <AdminLink href="/dashboard/admin/payments" icon={CreditCard}>
              支付设置
            </AdminLink>
            <AdminLink href="/dashboard/create" icon={Eye}>
              预览创作页
            </AdminLink>
          </div>
        </AppCard>

        <AdminStatsSection admin={admin} />
        <AdminAuditSection admin={admin} />
        <AdminPlanningSection admin={admin} />
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
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-stone-100 bg-stone-50/70 px-3 py-2.5 dark:border-white/8 dark:bg-white/4">
      <div className="min-w-0">
        <div className="truncate text-xs font-bold text-stone-500 dark:text-stone-400">{label}</div>
        <div className="mt-0.5 truncate text-[11px] font-bold text-stone-500 dark:text-stone-400">{detail}</div>
      </div>
      <div className="shrink-0 text-2xl font-extrabold text-stone-900 dark:text-stone-100">{value}</div>
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
      className="theme-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold active:scale-95"
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
      className: "text-stone-500",
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
      className: "text-red-700 dark:text-red-200",
    },
  }[admin.configSaveState];
  const Icon = stateMeta.icon;

  return (
    <div
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 text-xs font-semibold shadow-sm dark:border-white/8 dark:bg-white/4 ${stateMeta.className}`}
    >
      <Icon className={admin.configSaveState === "saving" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      <span className="truncate">{stateMeta.text}</span>
      {admin.configLastSavedAt ? (
        <span className="hidden text-[11px] font-bold text-stone-500 sm:inline">
          {admin.configLastSavedAt.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : null}
    </div>
  );
}

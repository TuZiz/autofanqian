"use client";

import {
  Activity,
  Bot,
  BrainCircuit,
  DatabaseZap,
  Gauge,
  LayoutTemplate,
  Shield,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";

import { AppShell, SectionCard } from "@/components/design-system";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { formatNumber } from "@/lib/admin/dashboard-admin-format";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

import { AdminAuditCompact } from "./admin-audit-compact";
import { AdminModuleCard, AdminStatCard, AdminStatusPill } from "./admin-console-primitives";
import { AdminVersionPopover } from "./admin-version-popover";
import { AdminAutoSaveStatus } from "./admin-workspace-shell";

type DashboardAdminViewProps = {
  admin: DashboardAdminController;
};

export function DashboardAdminView({ admin }: DashboardAdminViewProps) {
  const activeGenres = admin.config?.genres.filter((genre) => genre.active).length ?? 0;
  const totalGenres = admin.config?.genres.length ?? 0;
  const activePlatforms = admin.config?.platforms.filter((item) => item.active).length ?? 0;
  const activeDnaStyles = admin.config?.dnaStyles.filter((item) => item.active).length ?? 0;
  const activeWordOptions = admin.config?.wordOptions.filter((item) => item.active).length ?? 0;
  const enabledEntries = activeGenres + activePlatforms + activeDnaStyles + activeWordOptions;
  const canUpdateSystem = Boolean(admin.user?.isRootAdmin || admin.user?.role === "super_admin");
  const todaySuccessRate = getRate(admin.aiStats?.successCalls ?? 0, admin.aiStats?.totalCalls ?? 0);
  const leadModel = admin.aiStats?.allTime.byModel[0]?.modelUsed ?? "暂无调用";
  const leadRoute = admin.aiStats?.byRoute[0]?.routeLabel ?? admin.aiStats?.byRoute[0]?.routeId ?? "尚未产生";

  return (
    <AppShell
      actions={
        <DashboardTopbar
          title="管理员控制台"
          userEmail={admin.user?.email ?? ""}
          isAdmin={admin.user?.isAdmin}
          showBackToDashboard
          showAdminLink={false}
          logoutLabel="退出登录"
          maxWidthClassName="max-w-[1380px]"
        />
      }
      maxWidthClassName="max-w-[1380px]"
    >
      <div className="space-y-4">
        <header className="rounded-[18px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-4 shadow-[var(--theme-shadow-card)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                宸යා工作台 / 管理总览
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-brand-600)] shadow-[var(--theme-shadow-button)]">
                  <Gauge className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[20px] font-black tracking-[-0.03em] text-[var(--theme-text-strong)] sm:text-[22px]">
                    管理后台
                  </h1>
                  <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-[var(--theme-text-secondary)] sm:text-sm">
                    这里放总量、入口和最近动作。需要细调时，再进各自的工作页。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AdminVersionPopover canUpdate={canUpdateSystem} />
              <AdminAutoSaveStatus
                state={admin.configSaveState}
                lastSavedAt={admin.configLastSavedAt}
                error={admin.configSaveError}
              />
              <AdminStatusPill tone="brand">已启用 {enabledEntries} 个入口</AdminStatusPill>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusPill tone="neutral">类型 {activeGenres}/{totalGenres}</AdminStatusPill>
            <AdminStatusPill tone="neutral">平台 {activePlatforms}</AdminStatusPill>
            <AdminStatusPill tone="neutral">DNA {activeDnaStyles}</AdminStatusPill>
            <AdminStatusPill tone="neutral">字数 {activeWordOptions}</AdminStatusPill>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard
            description="今天的 AI 调用总量与成功率。"
            icon={DatabaseZap}
            label="今日调用"
            tone="brand"
            trend={`成功率 ${todaySuccessRate}`}
            value={formatNumber(admin.aiStats?.totalCalls ?? 0)}
          />
          <AdminStatCard
            description="今天的 Token 消耗，便于看成本波动。"
            icon={Bot}
            label="今日 Token"
            tone="ai"
            trend={`累计 ${formatNumber(admin.aiStats?.allTime.tokens.total ?? 0)}`}
            value={formatNumber(admin.aiStats?.tokens.total ?? 0)}
          />
          <AdminStatCard
            description="当前启用的创作入口总数。"
            icon={Workflow}
            label="启用入口"
            tone="success"
            trend={`${activeGenres} 类型 / ${activePlatforms} 平台`}
            value={formatNumber(enabledEntries)}
          />
          <AdminStatCard
            description="累计命中最多的模型。"
            icon={Shield}
            label="主力模型"
            tone="warning"
            trend={`累计 ${formatNumber(admin.aiStats?.allTime.totalCalls ?? 0)} 次调用`}
            value={leadModel}
          />
          <AdminStatCard
            description="今天排在最前面的路由。"
            icon={Activity}
            label="主力路由"
            tone="brand"
            trend="按今日调用排序"
            value={leadRoute}
          />
        </section>

        <SectionCard
          icon={LayoutTemplate}
          title="管理入口"
          description="点开卡片直接进入对应工作页。"
          variant="elevated"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AdminModuleCard
              href="/dashboard/admin/monitor"
              icon={Activity}
              title="实时 AI 监控"
              description="查看今日调用、Token 和路由排行。"
              detail="调用 / Token / 排行"
              status="监控面板"
              tone="ai"
            />
            <AdminModuleCard
              href="/dashboard/admin/entry-config"
              icon={LayoutTemplate}
              title="创作入口配置"
              description="管理类型卡片、平台、DNA 和字数。"
              detail="类型 / 平台 / DNA / 字数"
              status="内容配置"
              tone="brand"
            />
            <AdminModuleCard
              href="/dashboard/admin/rules"
              icon={SlidersHorizontal}
              title="规则参数配置"
              description="控制规划窗口、硬上限和章节长度。"
              detail="阈值 / 上限 / 预设"
              status="规则引擎"
            />
            <AdminModuleCard
              href="/dashboard/admin/templates"
              icon={BrainCircuit}
              title="预设模板库"
              description="维护模板版本与 AI 学习入口。"
              detail="模板 / 版本 / 学习"
              status="内容中枢"
              tone="success"
            />
            <AdminModuleCard
              href="/dashboard/admin/logs"
              icon={Gauge}
              title="后台审计日志"
              description="查看管理员操作记录，支持搜索和详情。"
              detail="操作 / 审计 / 追踪"
              status="安全审计"
              tone="warning"
            />
            <AdminModuleCard
              href="/dashboard/admin/users"
              icon={Users}
              title="用户管理"
              description="账号、权限、套餐和密码重置都在这里。"
              detail="账号 / 权限 / 套餐"
              status="核心入口"
            />
          </div>
        </SectionCard>

        <AdminAuditCompact admin={admin} />
      </div>
    </AppShell>
  );
}

function getRate(success: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((success / total) * 100)}%`;
}

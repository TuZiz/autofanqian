"use client";

import Link from "next/link";
import { ArrowRight, FileClock, RefreshCw } from "lucide-react";

import { Button } from "@/components/design-system";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

import { AdminEmptyStateCard, AdminStatusPill } from "./admin-console-primitives";

type AdminAuditCompactProps = {
  admin: DashboardAdminController;
};

export function AdminAuditCompact({ admin }: AdminAuditCompactProps) {
  const recentLogs = admin.auditLogs.slice(0, 5);

  return (
    <div className="rounded-[22px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.92)] p-4 shadow-[var(--theme-shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]">
            <FileClock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--theme-text-strong)]">最近动态</h3>
            <p className="text-[12px] font-medium text-[var(--theme-text-muted)]">
              最近 5 条管理员操作记录
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            icon={RefreshCw}
            busy={admin.auditLogsLoading}
            onClick={() => void admin.handleRefreshAuditLogs()}
            className="min-h-8 px-2 text-xs"
          >
            刷新
          </Button>
          <Link
            href="/dashboard/admin/logs"
            className="flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[rgba(255,255,255,0.88)] px-3 py-1.5 text-[11px] font-bold text-[var(--theme-text-secondary)] transition hover:border-[var(--theme-brand-border)] hover:text-[var(--theme-brand-text)]"
          >
            查看全部
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {admin.auditLogsLoading && !recentLogs.length ? (
        <div className="mt-4">
          <AdminEmptyStateCard
            title="正在加载审计日志"
            description="加载完成后会展示最近的管理员操作记录。"
          />
        </div>
      ) : recentLogs.length ? (
        <div className="mt-3 space-y-2">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.88)] px-4 py-3 transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--theme-text-strong)]">
                    {log.adminEmail}
                  </span>
                  <AdminStatusPill tone="neutral">
                    {actionLabel(log.action)}
                  </AdminStatusPill>
                </div>
                <p className="mt-1 text-xs font-medium text-[var(--theme-text-muted)]">
                  {log.targetType}
                  {log.targetId ? ` · ${log.targetId}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[var(--theme-text-muted)]">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <AdminEmptyStateCard
            icon={FileClock}
            title="暂无审计日志"
            description="管理员操作后，这里会展示最近的记录。"
          />
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "ai_model.update": "AI 配置",
    "create_config.update": "创作配置",
    "template.update": "模板更新",
    "template.delete": "模板删除",
    "user.create": "新增用户",
    "user.update": "用户更新",
    "user.delete": "用户删除",
    "user.reset_password": "重置密码",
  };

  return labels[action] ?? action;
}

"use client";

import { FileClock, Loader2, RefreshCw } from "lucide-react";

import { Button, SectionCard } from "@/components/design-system";
import { AdminEmptyStateCard, AdminStatusPill } from "@/components/admin/admin-console-primitives";
import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

export function AdminAuditSection({ admin }: { admin: DashboardAdminController }) {
  return (
    <SectionCard
      icon={FileClock}
      title="后台审计日志"
      description="最近 20 条管理员操作会在这里集中展示，密钥、密码和 token 字段保持脱敏。"
      actions={
        <Button
          type="button"
          icon={RefreshCw}
          busy={admin.auditLogsLoading}
          onClick={() => void admin.handleRefreshAuditLogs()}
          className="min-h-9 px-3"
        >
          刷新
        </Button>
      }
    >
      {admin.auditLogsLoading && !admin.auditLogs.length ? (
        <AdminEmptyStateCard
          title="正在加载审计日志"
          description="列表就绪后会按时间、管理员、动作、目标和来源五列展示。"
        />
      ) : admin.auditLogs.length ? (
        <div className="overflow-hidden rounded-[22px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.92)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--theme-divider)] bg-[var(--theme-surface-soft)] text-left text-[11px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
                <tr>
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3">管理员</th>
                  <th className="px-4 py-3">动作</th>
                  <th className="px-4 py-3">目标</th>
                  <th className="px-4 py-3">来源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-divider)]">
                {admin.auditLogs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-[var(--theme-surface-hover)]">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--theme-text-muted)]">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-[var(--theme-text-strong)]">{log.adminEmail}</div>
                      <div className="mt-1 text-xs font-medium text-[var(--theme-text-muted)]">
                        {log.adminUserId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusPill tone="neutral">{actionLabel(log.action)}</AdminStatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--theme-text-secondary)]">{log.targetType}</div>
                      {log.targetId ? (
                        <div className="mt-1 max-w-[18rem] truncate text-xs font-medium text-[var(--theme-text-muted)]">
                          {log.targetId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium leading-6 text-[var(--theme-text-muted)]">
                      <div>{log.ip || "未知 IP"}</div>
                      <div className="mt-1 max-w-[18rem] truncate">{log.userAgent || "未知 UA"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <AdminEmptyStateCard
          icon={FileClock}
          title="暂无审计日志"
          description="当管理员执行配置保存、模板更新、用户管理等操作后，这里会自动沉淀对应记录。"
          action={
            <Button
              type="button"
              icon={admin.auditLogsLoading ? Loader2 : RefreshCw}
              busy={admin.auditLogsLoading}
              onClick={() => void admin.handleRefreshAuditLogs()}
            >
              手动刷新
            </Button>
          }
        />
      )}
    </SectionCard>
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

"use client";

import {
  FileClock,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import { Button, FieldShell, SectionCard } from "@/components/design-system";
import type { AdminAuditLogItem } from "@/lib/admin/dashboard-admin-types";
import type { AdminLogsController } from "@/lib/admin/use-admin-logs";

import { AdminEmptyStateCard, AdminStatusPill } from "./admin-console-primitives";
import {
  AdminDetailDrawer,
  AdminWorkspaceLayout,
  AdminWorkspaceShell,
} from "./admin-workspace-shell";

type AdminLogsViewProps = {
  logs: AdminLogsController;
};

export function AdminLogsView({ logs }: AdminLogsViewProps) {
  const {
    auditLogsLoading,
    filteredLogs,
    handleRefreshAuditLogs,
    searchQuery,
    selectedLog,
    selectedLogId,
    setSearchQuery,
    setSelectedLogId,
    user,
  } = logs;

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "审计日志" }]}
      description="日志 / 审计记录"
      icon={FileClock}
      subtitle="集中查看管理员操作记录。密码、密钥和 token 等敏感字段保持脱敏。"
      title="后台审计日志"
      userEmail={user?.email ?? ""}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">
            共 {filteredLogs.length} 条
          </AdminStatusPill>
          {selectedLog ? (
            <AdminStatusPill tone="brand">
              已选中 1 条
            </AdminStatusPill>
          ) : null}
          {auditLogsLoading ? (
            <AdminStatusPill tone="brand">刷新中</AdminStatusPill>
          ) : null}
          <Button
            type="button"
            icon={RefreshCw}
            busy={auditLogsLoading}
            onClick={() => void handleRefreshAuditLogs()}
            className="min-h-9 px-3"
          >
            刷新
          </Button>
        </div>
      }
    >
      <AdminWorkspaceLayout
        leftNav={
          <LogSearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            totalCount={filteredLogs.length}
          />
        }
        drawer={
          <AdminDetailDrawer
            selected={Boolean(selectedLog)}
            title="日志详情"
            emptyTitle="未选择日志"
            emptyDescription="从中间列表里选择一条审计记录，这里会展示操作主体、目标和变更快照。"
          >
            {selectedLog ? <LogDetail log={selectedLog} /> : null}
          </AdminDetailDrawer>
        }
      >
        <SectionCard
          title="最近操作记录"
          description="按时间倒序展示后台操作，适合追踪配置修改、模板更新和用户管理动作。"
          icon={ShieldAlert}
          variant="elevated"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusPill tone="neutral">最近 50 条</AdminStatusPill>
              {searchQuery.trim() ? (
                <AdminStatusPill tone="brand">
                  关键词：{searchQuery.trim()}
                </AdminStatusPill>
              ) : null}
            </div>
          }
        >
          {auditLogsLoading && !filteredLogs.length ? (
            <AdminEmptyStateCard
              title="正在加载审计日志"
              description="列表就绪后，这里会按时间、管理员、动作、目标和来源展示记录。"
            />
          ) : filteredLogs.length ? (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLogId(log.id)}
                  className={`w-full rounded-[16px] border p-4 text-left transition ${
                    log.id === selectedLogId
                      ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] shadow-[var(--theme-shadow-card)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-black text-[var(--theme-text-strong)]">
                          {log.adminEmail}
                        </span>
                        <AdminStatusPill tone={getActionTone(log.action)}>
                          {actionLabel(log.action)}
                        </AdminStatusPill>
                        <AdminStatusPill tone="neutral">
                          {formatTarget(log)}
                        </AdminStatusPill>
                      </div>
                      <p className="mt-2 text-[12px] font-medium leading-5 text-[var(--theme-text-secondary)]">
                        {log.ip ? `来源 IP ${log.ip}` : "来源 IP 未记录"}
                        {log.userAgent ? ` · ${truncate(log.userAgent, 72)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--theme-text-muted)]">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <AdminEmptyStateCard
              icon={FileClock}
              title="暂无审计日志"
              description="管理员执行配置保存、模板更新、用户管理等动作后，这里会自动写入对应记录。"
              action={
                <Button
                  type="button"
                  icon={auditLogsLoading ? Loader2 : RefreshCw}
                  busy={auditLogsLoading}
                  onClick={() => void handleRefreshAuditLogs()}
                >
                  手动刷新
                </Button>
              }
            />
          )}
        </SectionCard>
      </AdminWorkspaceLayout>
    </AdminWorkspaceShell>
  );
}

function LogSearchPanel({
  query,
  onQueryChange,
  totalCount,
}: {
  onQueryChange: (query: string) => void;
  query: string;
  totalCount: number;
}) {
  return (
    <SectionCard
      title="搜索与范围"
      description="按管理员邮箱、动作、目标类型或目标 ID 快速筛选。"
      icon={Search}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FieldShell
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            type="text"
            placeholder="搜索管理员、动作、目标..."
            icon={Search}
            className="flex-1"
          />
          {query ? (
            <Button
              type="button"
              tone="ghost"
              icon={X}
              onClick={() => onQueryChange("")}
              className="min-h-10 px-3"
            >
              清空
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">命中 {totalCount} 条</AdminStatusPill>
          <AdminStatusPill tone={query.trim() ? "brand" : "neutral"}>
            {query.trim() ? "已启用筛选" : "未筛选"}
          </AdminStatusPill>
        </div>
      </div>
    </SectionCard>
  );
}

function LogDetail({ log }: { log: AdminAuditLogItem }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusPill tone={getActionTone(log.action)}>
          {actionLabel(log.action)}
        </AdminStatusPill>
        <AdminStatusPill tone="neutral">{formatTarget(log)}</AdminStatusPill>
      </div>

      <DetailRow label="时间" value={formatDateTime(log.createdAt, true)} />
      <DetailRow label="管理员" value={log.adminEmail} />
      <DetailRow label="管理员 ID" value={log.adminUserId} />
      <DetailRow label="目标类型" value={log.targetType} />
      {log.targetId ? <DetailRow label="目标 ID" value={log.targetId} /> : null}
      <DetailRow label="来源 IP" value={log.ip || "未记录"} />
      <DetailRow label="User Agent" value={log.userAgent || "未记录"} />

      {log.before ? (
        <JsonBlock title="变更前快照" value={log.before} />
      ) : null}
      {log.after ? (
        <JsonBlock title="变更后快照" value={log.after} />
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-[var(--theme-text-strong)]">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">
        {title}
      </p>
      <pre className="mt-1 max-h-48 overflow-auto rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3 text-xs font-medium leading-6 text-[var(--theme-text-secondary)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function formatDateTime(value: string, withYear = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: withYear ? "numeric" : undefined,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function getActionTone(action: string): "brand" | "danger" | "neutral" | "success" | "warning" {
  if (action.includes("delete")) return "danger";
  if (action.includes("create")) return "success";
  if (action.includes("reset_password")) return "warning";
  if (action.includes("update")) return "brand";
  return "neutral";
}

function formatTarget(log: AdminAuditLogItem) {
  return log.targetId ? `${log.targetType} / ${log.targetId}` : log.targetType;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

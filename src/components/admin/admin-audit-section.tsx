"use client";

import { FileClock, Loader2, RefreshCw } from "lucide-react";

import type { DashboardAdminController } from "@/lib/admin/use-dashboard-admin";

export function AdminAuditSection({ admin }: { admin: DashboardAdminController }) {
  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-stone-950">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700 ring-1 ring-stone-200 dark:bg-white/10 dark:text-stone-200 dark:ring-white/10">
            <FileClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-stone-950 dark:text-stone-50">
              后台审计日志
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-stone-500 dark:text-stone-400">
              最近 20 条管理员操作，密钥、密码和 token 字段会自动隐藏。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void admin.handleRefreshAuditLogs()}
          disabled={admin.auditLogsLoading}
          className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {admin.auditLogsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          刷新
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-100 text-sm dark:divide-white/10">
          <thead className="bg-stone-50/80 text-left text-xs font-black uppercase tracking-[0.12em] text-stone-500 dark:bg-white/[0.03] dark:text-stone-400">
            <tr>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">管理员</th>
              <th className="px-4 py-3">动作</th>
              <th className="px-4 py-3">目标</th>
              <th className="px-4 py-3">来源</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/10">
            {admin.auditLogsLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在加载审计日志...
                  </span>
                </td>
              </tr>
            ) : admin.auditLogs.length ? (
              admin.auditLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-500 dark:text-stone-400">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-700 dark:text-stone-200">
                    {log.adminEmail}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-black text-stone-700 ring-1 ring-stone-200 dark:bg-white/[0.06] dark:text-stone-200 dark:ring-white/10">
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-300">
                    <div>{log.targetType}</div>
                    {log.targetId ? (
                      <div className="mt-1 max-w-[18rem] truncate text-xs text-stone-500 dark:text-stone-400">
                        {log.targetId}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold leading-5 text-stone-500 dark:text-stone-400">
                    <div>{log.ip || "未知 IP"}</div>
                    <div className="mt-1 max-w-[18rem] truncate">{log.userAgent || "未知 UA"}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-stone-500 dark:text-stone-400">
                  暂无审计日志。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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

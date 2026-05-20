"use client";

import { Key, Lock, PencilLine, Search, Shield, Trash2 } from "lucide-react";

import { AppButton, AppCard, AppChip, AppInput } from "@/components/app-ui";
import { membershipTierLabels } from "@/lib/auth/user-groups";
import { formatDateTime } from "@/lib/admin/users-format";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

type AdminUsersTableProps = {
  users: AdminUsersController;
};

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  return (
    <AppCard className="overflow-hidden bg-[var(--theme-surface-strong)]">
      <div className="flex flex-col gap-3 border-b border-[var(--theme-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--theme-text-strong)]">账号列表</h2>
          <p className="mt-0.5 text-xs font-semibold text-[var(--theme-text-muted)]">
            支持搜索：编码 / ID / 邮箱 / 昵称
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="group relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--theme-text-muted)] transition-colors group-focus-within:text-[var(--theme-brand-600)]" />
            <AppInput
              value={users.query}
              onChange={(event) => users.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void users.handleSearch();
              }}
              type="text"
              placeholder="搜索账号..."
              className="w-full pl-9"
            />
          </div>
          <AppButton
            type="button"
            onClick={() => void users.handleSearch()}
            isDisabled={users.loading}
            className="h-9 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]"
          >
            搜索
          </AppButton>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-18rem)] min-h-[260px] overflow-auto">
        <table className="w-full min-w-[1060px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[var(--theme-surface-strong)]/95 text-[11px] uppercase tracking-[0.12em] text-[var(--theme-text-muted)] backdrop-blur">
            <tr>
              <th className="px-4 py-2.5 font-semibold">编号</th>
              <th className="px-4 py-2.5 font-semibold">邮箱</th>
              <th className="px-4 py-2.5 font-semibold">昵称</th>
              <th className="px-4 py-2.5 font-semibold">身份</th>
              <th className="px-4 py-2.5 font-semibold">套餐</th>
              <th className="px-4 py-2.5 font-semibold">状态</th>
              <th className="px-4 py-2.5 font-semibold">注册时间</th>
              <th className="px-4 py-2.5 font-semibold">最后登录</th>
              <th className="px-4 py-2.5 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border)]">
            {users.loading ? (
              <EmptyRow text="正在加载..." />
            ) : users.users.length ? (
              users.users.map((user) => (
                <tr key={user.id} className="group transition-colors hover:bg-[var(--theme-surface-overlay)]">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">{user.code}</td>
                  <td className="px-4 py-2.5">
                    <EditableValue
                      title="编辑邮箱"
                      value={user.email}
                      disabled={user.isRootAdmin && !users.isRootAdmin}
                      onClick={() => users.openUserEditor(user, "email")}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <EditableValue
                      title="编辑昵称"
                      value={user.name?.trim() || "-"}
                      disabled={user.isRootAdmin && !users.isRootAdmin}
                      onClick={() => users.openUserEditor(user, "name")}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <AppChip
                        className={
                          user.isAdmin
                            ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                            : "bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]"
                        }
                      >
                        {user.isAdmin ? <Shield className="h-3 w-3" /> : null}
                        {user.isAdmin ? user.displayGroup : "普通用户"}
                      </AppChip>
                    </div>
                    {user.isRootAdmin ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--theme-warning-text)]">
                        <Lock className="h-3 w-3" />
                        根管理员
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <AppChip className={getMembershipTierBadgeClassName(user.membershipTier)}>
                      {membershipTierLabels[user.membershipTier]}
                    </AppChip>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "h-2 w-2 rounded-full",
                              user.emailVerified
                                ? "bg-[var(--theme-brand-400)] shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                              : "bg-[var(--theme-warning-text)]",
                            ].join(" ")}
                          />
                          <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
                            {user.emailVerified ? "已验证" : "未验证"}
                          </span>
                        </div>
                        <AppChip className={getStatusBadgeClassName(user.status)}>
                          {getStatusLabel(user.status)}
                        </AppChip>
                        <span className="text-[11px] font-semibold text-[var(--theme-text-muted)]">
                          {user.hasPassword ? "已设置密码" : "未设置密码"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => users.openUserEditor(user)}
                        disabled={user.isRootAdmin && !users.isRootAdmin}
                        className="rounded-lg p-1.5 text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
                        title="编辑状态"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => users.setPasswordEditor({ user, value: "" })}
                        disabled={user.isRootAdmin && !users.isRootAdmin}
                        className="rounded-lg p-1.5 text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-warning-soft)] hover:text-[var(--theme-warning-text)] disabled:cursor-not-allowed disabled:opacity-40"
                        title="修改密码"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void users.handleDeleteUser(user)}
                        disabled={user.isRootAdmin}
                        className="rounded-lg p-1.5 text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-danger-soft)] hover:text-[var(--theme-danger-text)] disabled:cursor-not-allowed disabled:opacity-40"
                        title={user.isRootAdmin ? "根管理员账号不能删除" : "删除用户"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow text="暂无数据" />
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-4 py-3">
        <div className="text-sm font-semibold text-[var(--theme-text-muted)]">共找到 {users.total.toLocaleString()} 条数据</div>
        <div className="flex items-center gap-2">
          <AppButton
            type="button"
            isDisabled={users.loading || users.page <= 1}
            onClick={() => void users.goToPage(Math.max(1, users.page - 1))}
            className="h-8 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs text-[var(--theme-text-primary)]"
          >
            上一页
          </AppButton>
          <span className="font-mono text-sm font-semibold text-[var(--theme-text-muted)]">
            {users.page}/{users.totalPages}
          </span>
          <AppButton
            type="button"
            isDisabled={users.loading || users.page >= users.totalPages}
            onClick={() => void users.goToPage(Math.min(users.totalPages, users.page + 1))}
            className="h-8 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs text-[var(--theme-text-primary)]"
          >
            下一页
          </AppButton>
        </div>
      </div>
    </AppCard>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={9} className="px-6 py-10 text-center text-sm font-semibold text-[var(--theme-text-muted)]">
        {text}
      </td>
    </tr>
  );
}

function EditableValue({
  disabled,
  onClick,
  title,
  value,
}: {
  disabled?: boolean;
  onClick: () => void;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[18rem] truncate text-sm font-semibold text-[var(--theme-text-primary)]" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg p-1.5 text-[var(--theme-text-muted)] transition-colors hover:bg-[var(--theme-brand-soft)] hover:text-[var(--theme-brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
        title={title}
      >
        <PencilLine className="h-4 w-4" />
      </button>
    </div>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "limited":
      return "受限";
    case "banned":
      return "封禁";
    case "deleted":
      return "已删除";
    default:
      return status;
  }
}

function getStatusBadgeClassName(status: string) {
  switch (status) {
    case "active":
      return "w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
    case "limited":
      return "w-fit border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300";
    case "banned":
      return "w-fit border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300";
    case "deleted":
      return "w-fit border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400";
    default:
      return "w-fit bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]";
  }
}

function getMembershipTierBadgeClassName(tier: string) {
  switch (tier) {
    case "plus":
      return "w-fit border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300";
    case "pro":
      return "w-fit border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300";
    case "max":
      return "w-fit border-zinc-300 bg-zinc-950 text-white dark:border-white/15 dark:bg-white dark:text-zinc-950";
    default:
      return "w-fit border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";
  }
}

"use client";

import type { ReactNode } from "react";
import {
  Key,
  Lock,
  PencilLine,
  Search,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  Button,
  FieldShell,
  SectionCard,
  StatusBadge,
} from "@/components/design-system";
import { membershipTierLabels } from "@/lib/auth/user-groups";
import { formatDateTime } from "@/lib/admin/users-format";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

type AdminUsersTableProps = {
  users: AdminUsersController;
};

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  return (
    <SectionCard
      title="账号列表"
      description="支持按编号、ID、邮箱或显示名称搜索，方便在控制台中快速定位并处理账号。"
      icon={UserRound}
      variant="elevated"
      className="overflow-hidden"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <FieldShell
            value={users.query}
            onChange={(event) => users.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void users.handleSearch();
            }}
            type="text"
            placeholder="搜索账号..."
            icon={Search}
            className="w-full sm:min-w-[280px]"
          />
          <Button
            type="button"
            onClick={() => void users.handleSearch()}
            disabled={users.loading}
            className="min-h-10 px-3"
          >
            搜索
          </Button>
        </div>
      }
    >
      <div className="-mx-4 -mb-4 mt-1 overflow-hidden border-t border-[var(--theme-divider)]">
        <div className="max-h-[calc(100dvh-18rem)] min-h-[280px] overflow-auto">
          <table className="w-full min-w-[1060px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--theme-surface-strong)]/95 text-[11px] uppercase tracking-[0.12em] text-[var(--theme-text-muted)] backdrop-blur">
              <tr>
                <th className="px-4 py-2.5 font-semibold">编号</th>
                <th className="px-4 py-2.5 font-semibold">邮箱</th>
                <th className="px-4 py-2.5 font-semibold">显示名称</th>
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
                <EmptyRow text="正在加载账号数据..." />
              ) : users.users.length ? (
                users.users.map((user) => (
                  <tr
                    key={user.id}
                    className="group transition-colors hover:bg-[var(--theme-surface-overlay)]/80"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">
                      {user.code}
                    </td>
                    <td className="px-4 py-3">
                      <EditableValue
                        title="编辑邮箱"
                        value={user.email}
                        disabled={user.isRootAdmin && !users.isRootAdmin}
                        onClick={() => users.openUserEditor(user, "email")}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableValue
                        title="编辑显示名称"
                        value={user.name?.trim() || "-"}
                        disabled={user.isRootAdmin && !users.isRootAdmin}
                        onClick={() => users.openUserEditor(user, "name")}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <InlineBadge tone={user.isAdmin ? "ai" : "neutral"}>
                          {user.isAdmin ? <Shield className="h-3 w-3" /> : null}
                          {user.isAdmin ? user.displayGroup : "普通用户"}
                        </InlineBadge>
                        {user.isRootAdmin ? (
                          <InlineBadge tone="warning">
                            <Lock className="h-3 w-3" />
                            根管理员
                          </InlineBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InlineBadge tone={getMembershipTierTone(user.membershipTier)}>
                        {membershipTierLabels[user.membershipTier]}
                      </InlineBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "h-2 w-2 rounded-full",
                                user.emailVerified
                                  ? "bg-[var(--theme-brand-400)] shadow-[0_0_12px_rgba(14,165,233,0.35)]"
                                  : "bg-[var(--theme-warning-text)]",
                              ].join(" ")}
                            />
                            <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
                              {user.emailVerified ? "邮箱已验证" : "邮箱未验证"}
                            </span>
                          </div>
                          <InlineBadge tone={getStatusTone(user.status)}>
                            {getStatusLabel(user.status)}
                          </InlineBadge>
                          <span className="text-[11px] font-semibold text-[var(--theme-text-muted)]">
                            {user.hasPassword ? "已设置密码" : "未设置密码"}
                          </span>
                        </div>
                        <IconActionButton
                          title="编辑状态"
                          onClick={() => users.openUserEditor(user)}
                          disabled={user.isRootAdmin && !users.isRootAdmin}
                        >
                          <PencilLine className="h-4 w-4" />
                        </IconActionButton>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--theme-text-muted)]">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        <IconActionButton
                          title="修改密码"
                          onClick={() => users.setPasswordEditor({ user, value: "" })}
                          disabled={user.isRootAdmin && !users.isRootAdmin}
                          tone="warning"
                        >
                          <Key className="h-4 w-4" />
                        </IconActionButton>
                        <IconActionButton
                          title={user.isRootAdmin ? "根管理员账号不能删除" : "删除用户"}
                          onClick={() => void users.handleDeleteUser(user)}
                          disabled={user.isRootAdmin}
                          tone="danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyRow text="暂无匹配的账号记录" />
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--theme-text-muted)]">
            共找到 {users.total.toLocaleString()} 条账号记录
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={users.loading || users.page <= 1}
              onClick={() => void users.goToPage(Math.max(1, users.page - 1))}
              className="min-h-8 px-3 text-xs"
            >
              上一页
            </Button>
            <span className="font-mono text-sm font-semibold text-[var(--theme-text-muted)]">
              {users.page}/{users.totalPages}
            </span>
            <Button
              type="button"
              disabled={users.loading || users.page >= users.totalPages}
              onClick={() => void users.goToPage(Math.min(users.totalPages, users.page + 1))}
              className="min-h-8 px-3 text-xs"
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={9} className="px-6 py-12 text-center text-sm font-semibold text-[var(--theme-text-muted)]">
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
      <span
        className="max-w-[18rem] truncate text-sm font-semibold text-[var(--theme-text-primary)]"
        title={value}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg border border-transparent p-1.5 text-[var(--theme-text-muted)] transition-colors hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-brand-600)] disabled:cursor-not-allowed disabled:opacity-40"
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

function getStatusTone(status: string): "ai" | "danger" | "neutral" | "success" | "warning" {
  switch (status) {
    case "active":
      return "success";
    case "limited":
      return "warning";
    case "banned":
      return "danger";
    case "deleted":
      return "neutral";
    default:
      return "neutral";
  }
}

function getMembershipTierTone(tier: string): "ai" | "danger" | "neutral" | "success" | "warning" {
  switch (tier) {
    case "plus":
      return "success";
    case "pro":
      return "ai";
    case "max":
      return "warning";
    default:
      return "neutral";
  }
}

function InlineBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "ai" | "danger" | "neutral" | "success" | "warning";
}) {
  return (
    <StatusBadge className="rounded-full px-2.5 py-1 text-[10px] font-extrabold" tone={tone}>
      {children}
    </StatusBadge>
  );
}

function IconActionButton({
  children,
  disabled,
  onClick,
  title,
  tone = "neutral",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  tone?: "danger" | "neutral" | "warning";
}) {
  const toneClassName =
    tone === "danger"
      ? "hover:bg-[var(--theme-danger-soft)] hover:text-[var(--theme-danger-text)]"
      : tone === "warning"
        ? "hover:bg-[var(--theme-warning-soft)] hover:text-[var(--theme-warning-text)]"
        : "hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-brand-600)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-lg border border-transparent p-1.5 text-[var(--theme-text-muted)] transition-colors",
        "hover:border-[var(--theme-border)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        toneClassName,
      ].join(" ")}
      title={title}
    >
      {children}
    </button>
  );
}

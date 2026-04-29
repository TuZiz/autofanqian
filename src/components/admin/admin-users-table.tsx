"use client";

import { Key, PencilLine, Search, Shield, Trash2 } from "lucide-react";

import { formatDateTime } from "@/lib/admin/users-format";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

type AdminUsersTableProps = {
  users: AdminUsersController;
};

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  return (
    <section className="glass-panel rounded-lg p-5 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="theme-heading text-xl font-bold">账号列表</h2>
          <p className="theme-muted mt-1 text-sm">支持搜索：编码 / id / 邮箱 / 昵称</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="group relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
            <input
              value={users.query}
              onChange={(event) => users.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void users.handleSearch();
              }}
              type="text"
              placeholder="搜索 编码 / ID / 邮箱 / 昵称..."
              className="theme-input w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void users.handleSearch()}
            disabled={users.loading}
            className="theme-button-secondary inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-70"
          >
            搜索
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="theme-muted text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">编号</th>
              <th className="px-6 py-4 font-semibold">邮箱</th>
              <th className="px-6 py-4 font-semibold">昵称</th>
              <th className="px-6 py-4 font-semibold">角色</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">注册时间</th>
              <th className="px-6 py-4 font-semibold">最后登录</th>
              <th className="px-6 py-4 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.loading ? (
              <EmptyRow text="正在加载..." />
            ) : users.users.length ? (
              users.users.map((user) => (
                <tr
                  key={user.id}
                  className="group transition-colors hover:bg-white/30 dark:hover:bg-white/5"
                >
                  <td className="theme-muted px-6 py-4 font-mono text-xs">{user.code}</td>
                  <td className="px-6 py-4">
                    <EditableValue
                      title="编辑邮箱"
                      value={user.email}
                      onClick={() => users.openUserEditor(user, "email")}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <EditableValue
                      title="编辑昵称"
                      value={user.name?.trim() || "-"}
                      onClick={() => users.openUserEditor(user, "name")}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
                        user.isAdmin
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                          : "border-white/20 bg-white/30 text-slate-700 dark:text-slate-200",
                      ].join(" ")}
                    >
                      {user.isAdmin ? <Shield className="h-3 w-3" /> : null}
                      {user.isAdmin ? "管理员" : "普通用户"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "h-2 w-2 rounded-full",
                              user.emailVerified
                                ? "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                                : "bg-amber-400",
                            ].join(" ")}
                          />
                          <span className="theme-muted text-sm">
                            {user.emailVerified ? "已验证" : "未验证"}
                          </span>
                        </div>
                        <span className="theme-muted text-xs">
                          {user.hasPassword ? "已设置密码" : "未设置密码"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => users.openUserEditor(user)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600"
                        title="编辑状态"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="theme-muted px-6 py-4 font-mono text-xs">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="theme-muted px-6 py-4 font-mono text-xs">
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => users.setPasswordEditor({ user, value: "" })}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                        title="修改密码"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void users.handleDeleteUser(user)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                        title="删除用户"
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="theme-muted text-sm">共找到 {users.total.toLocaleString()} 条数据</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={users.loading || users.page <= 1}
            onClick={() => void users.goToPage(Math.max(1, users.page - 1))}
            className="theme-button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            上一页
          </button>
          <span className="theme-muted font-mono text-sm">
            {users.page}/{users.totalPages}
          </span>
          <button
            type="button"
            disabled={users.loading || users.page >= users.totalPages}
            onClick={() => void users.goToPage(Math.min(users.totalPages, users.page + 1))}
            className="theme-button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={8} className="theme-muted px-6 py-10 text-center text-sm">
        {text}
      </td>
    </tr>
  );
}

function EditableValue({
  onClick,
  title,
  value,
}: {
  onClick: () => void;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="theme-heading text-sm font-medium">{value}</span>
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600"
        title={title}
      >
        <PencilLine className="h-4 w-4" />
      </button>
    </div>
  );
}

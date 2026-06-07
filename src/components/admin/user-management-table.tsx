"use client";

import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatRelativeTime,
  getMembershipMeta,
  getUserRoleMeta,
  getUserStatusMeta,
} from "@/lib/admin/admin-format";
import type { AdminUserListItem } from "@/lib/admin/admin-user-types";
import type { AdminUsersLiteController } from "@/lib/admin/use-admin-users-lite";
import { cn } from "@/lib/utils";

export function UserManagementTable({ users }: { users: AdminUsersLiteController }) {
  if (users.loading && !users.users.length) {
    return (
      <div className="flex min-h-[360px] items-center justify-center gap-2 rounded-[18px] border border-[#d9e5f2] bg-white text-sm font-bold text-[#7b8ca5]">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载用户...
      </div>
    );
  }

  if (!users.users.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] border border-[#d9e5f2] bg-white px-4 text-center shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
        <Search className="h-8 w-8 text-[#9badc2]" />
        <p className="mt-3 text-sm font-black text-[#172033]">没有匹配用户</p>
        <p className="mt-1 text-xs font-semibold text-[#7b8ca5]">调整筛选条件后再试。</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#d9e5f2] bg-white shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] w-full text-left text-sm">
          <thead className="border-b border-[#eef3f8] bg-[#f8fbff] text-[11px] font-black uppercase tracking-[0.12em] text-[#7b8ca5]">
            <tr>
              <th className="px-4 py-3">编号</th>
              <th className="px-4 py-3">邮箱 / 昵称</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">会员</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">验证</th>
              <th className="px-4 py-3">最近登录</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">统计</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onDetail={() => users.setSelectedUserId(user.id)}
                onEdit={() => users.setEditingUserId(user.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {users.nextCursor ? (
        <div className="border-t border-[#eef3f8] px-4 py-3 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => users.loadMore()}
            disabled={users.loadingMore}
          >
            {users.loadingMore ? "加载中..." : "加载更多"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function UserRow({
  onDetail,
  onEdit,
  user,
}: {
  onDetail: () => void;
  onEdit: () => void;
  user: AdminUserListItem;
}) {
  const statusMeta = getUserStatusMeta(user.status);
  const roleMeta = getUserRoleMeta(user.role);
  const membershipMeta = getMembershipMeta(user.membershipTier);
  const RoleIcon = roleMeta.icon;

  return (
    <tr className="border-b border-[#eef3f8] align-top last:border-0 hover:bg-[#fbfdff]">
      <td className="px-4 py-3 font-black text-[#172033]">#{user.code}</td>
      <td className="max-w-[260px] px-4 py-3">
        <p className="truncate font-black text-[#172033]">{user.email}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#7b8ca5]">{user.name || "未设置昵称"}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black", roleMeta.className)}>
          {RoleIcon ? <RoleIcon className="h-3.5 w-3.5" /> : null}
          {roleMeta.label}
        </span>
        {user.isRootAdmin ? (
          <p className="mt-1 text-[11px] font-black text-[#a16207]">root admin</p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", membershipMeta.className)}>
          {membershipMeta.label}
        </span>
        <p className="mt-1 text-[11px] font-semibold text-[#7b8ca5]">
          到期 {formatDateTime(user.membershipExpiresAt)}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-black", statusMeta.className)}>
          {statusMeta.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        {user.emailVerified ? "已验证" : "未验证"}
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        <p>{formatRelativeTime(user.lastLoginAt)}</p>
        <p className="mt-1 text-[#7b8ca5]">{formatDateTime(user.lastLoginAt)}</p>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        {formatDateTime(user.createdAt)}
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        <p>作品 {user.stats.works}</p>
        <p className="mt-1">任务 {user.stats.generationJobs}</p>
        <p className="mt-1">今日 AI {user.stats.todayAiCalls}</p>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDetail}>
            详情
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            编辑
          </Button>
        </div>
      </td>
    </tr>
  );
}

"use client";

import { Eye, Loader2, Pencil, Search } from "lucide-react";

import {
  adminPanelClassName,
  adminSecondaryButtonClassName,
} from "@/components/admin/admin-page-shell";
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
      <div className={`${adminPanelClassName} flex min-h-[360px] items-center justify-center gap-2 text-sm font-bold text-[#7084a3]`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载用户...
      </div>
    );
  }

  if (!users.users.length) {
    return (
      <div className={`${adminPanelClassName} flex min-h-[320px] flex-col items-center justify-center px-4 text-center`}>
        <Search className="h-8 w-8 text-[#8aa0bd]" />
        <p className="mt-3 text-sm font-black text-[#14213d]">没有匹配用户</p>
        <p className="mt-1 text-xs font-semibold text-[#7084a3]">调整筛选条件后再试。</p>
      </div>
    );
  }

  return (
    <section className={`${adminPanelClassName} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1500px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[88px]" />
            <col className="w-[360px]" />
            <col className="w-[170px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[105px]" />
            <col className="w-[165px]" />
            <col className="w-[165px]" />
            <col className="w-[170px]" />
            <col className="w-[157px]" />
          </colgroup>
          <thead className="border-b border-[#e7eef8] bg-[#fbfdff] text-[12px] font-black text-[#536889]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">编号</th>
              <th className="whitespace-nowrap px-4 py-3">邮箱 / 昵称</th>
              <th className="whitespace-nowrap px-4 py-3">角色</th>
              <th className="whitespace-nowrap px-4 py-3">会员</th>
              <th className="whitespace-nowrap px-4 py-3">状态</th>
              <th className="whitespace-nowrap px-4 py-3">验证</th>
              <th className="whitespace-nowrap px-4 py-3">最近登录</th>
              <th className="whitespace-nowrap px-4 py-3">创建时间</th>
              <th className="whitespace-nowrap px-4 py-3">统计</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">操作</th>
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
        <div className="border-t border-[#e7eef8] px-6 py-4 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => users.loadMore()}
            disabled={users.loadingMore}
            className={adminSecondaryButtonClassName}
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
    <tr className="border-b border-[#e7eef8] align-middle last:border-0 hover:bg-[#fbfdff]">
      <td className="whitespace-nowrap px-4 py-3 text-[15px] font-black text-[#14213d]">#{user.code}</td>
      <td className="px-4 py-3">
        <p className="truncate text-[15px] font-black leading-6 text-[#14213d]">{user.email}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-[#7084a3]">{user.name || "未设置昵称"}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex h-7 items-center gap-1 rounded-none border px-3 text-xs font-black leading-none whitespace-nowrap", roleMeta.className)}>
          {RoleIcon ? <RoleIcon className="h-3.5 w-3.5" /> : null}
          {roleMeta.label}
        </span>
        {user.isRootAdmin ? (
          <p className="mt-1 text-[11px] font-black text-[#a16207]">root admin</p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex h-7 items-center rounded-none border px-3 text-xs font-black leading-none whitespace-nowrap", membershipMeta.className)}>
          {membershipMeta.label}
        </span>
        <p className="mt-1 whitespace-nowrap text-xs font-semibold text-[#7084a3]">
          到期 {formatDateTime(user.membershipExpiresAt)}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex h-7 min-w-[58px] items-center justify-center rounded-none border px-3 text-xs font-black leading-none whitespace-nowrap", statusMeta.className)}>
          {statusMeta.label}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-[#536889]">
        {user.emailVerified ? "已验证" : "未验证"}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-[#536889]">
        <p>{formatRelativeTime(user.lastLoginAt)}</p>
        <p className="mt-0.5 text-[#7084a3]">{formatDateTime(user.lastLoginAt)}</p>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-[#536889]">
        {formatDateTime(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5 text-[11px] font-black text-[#536889]">
          <span className="rounded-none border border-[#d9e6f5] bg-[#f7fbff] px-2.5 py-0.5">作品 {user.stats.works}</span>
          <span className="rounded-none border border-[#d9e6f5] bg-[#f7fbff] px-2.5 py-0.5">任务 {user.stats.generationJobs}</span>
          <span className="rounded-none border border-[#d9e6f5] bg-[#f7fbff] px-2.5 py-0.5">AI {user.stats.todayAiCalls}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDetail} className="h-8 rounded-none border-[#d9e6f5] bg-white px-2.5 text-xs font-black text-[#14213d] hover:bg-[#f7fbff]">
            <Eye className="h-4 w-4" />
            详情
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="h-8 rounded-none border-[#d9e6f5] bg-white px-2.5 text-xs font-black text-[#14213d] hover:bg-[#f7fbff]">
            <Pencil className="h-4 w-4" />
            编辑
          </Button>
        </div>
      </td>
    </tr>
  );
}

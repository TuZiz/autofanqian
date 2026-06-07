"use client";

import { Plus, UsersRound } from "lucide-react";

import { Button } from "@/components/design-system";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

import { AdminStatusPill } from "./admin-console-primitives";
import { AdminUsersModals } from "./admin-users-modals";
import { AdminUsersTable } from "./admin-users-table";
import { AdminWorkspaceShell } from "./admin-workspace-shell";

type AdminUsersViewProps = {
  users: AdminUsersController;
};

export function AdminUsersView({ users }: AdminUsersViewProps) {
  const totalUsers = users.total.toLocaleString();

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "用户管理" }]}
      description="账号 / 用户中心"
      icon={UsersRound}
      subtitle="系统只保存加密后的 passwordHash；密码、角色和会员组统一在弹窗中完成，避免页面跳转。"
      title="后台账号管理"
      userEmail={users.userEmail}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">共 {totalUsers} 人</AdminStatusPill>
          <AdminStatusPill tone="neutral">
            第 {users.page}/{users.totalPages} 页
          </AdminStatusPill>
          <AdminStatusPill tone="brand">{users.query.trim() ? `筛选 ${users.query.trim()}` : "全部账号"}</AdminStatusPill>
          <Button type="button" icon={Plus} onClick={() => users.setCreateOpen(true)} className="min-h-9 px-3">
            新增用户
          </Button>
        </div>
      }
    >
      <AdminUsersTable users={users} />
      <AdminUsersModals users={users} />
    </AdminWorkspaceShell>
  );
}

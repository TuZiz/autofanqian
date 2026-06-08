"use client";

import { Users } from "lucide-react";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { AdminHero, AdminPageShell } from "@/components/admin/admin-page-shell";
import { useAdminUsersLite } from "@/lib/admin/use-admin-users-lite";

import { UserDetailDrawer } from "./user-detail-drawer";
import { UserEditDialog } from "./user-edit-dialog";
import { UserManagementFilters } from "./user-management-filters";
import { UserManagementSummary } from "./user-management-summary";
import { UserManagementTable } from "./user-management-table";

export function UserManagementDashboard() {
  const users = useAdminUsersLite();

  return (
    <AdminPageShell nav={<AdminNavTabs />}>
      <AdminHero
        icon={Users}
        eyebrow="后台 / 用户管理"
        title="用户管理"
        description="查看用户、搜索账号、调整会员、限制账号与重置账号状态。"
        refreshBusy={users.loading}
        refreshLabel="刷新用户"
        onRefresh={() => void users.refresh()}
      />

      {users.error ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {users.error}
        </div>
      ) : null}

      {users.notice ? (
        <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {users.notice}
        </div>
      ) : null}

      <UserManagementSummary data={users.data} />
      <UserManagementFilters users={users} />
      <UserManagementTable users={users} />

      <UserDetailDrawer
        userId={users.selectedUserId}
        onClose={() => users.setSelectedUserId(null)}
      />
      <UserEditDialog controller={users} />
    </AdminPageShell>
  );
}

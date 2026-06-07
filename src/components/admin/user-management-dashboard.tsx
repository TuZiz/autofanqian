"use client";

import { Users } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { useAdminUsersLite } from "@/lib/admin/use-admin-users-lite";

import { UserDetailDrawer } from "./user-detail-drawer";
import { UserEditDialog } from "./user-edit-dialog";
import { UserManagementFilters } from "./user-management-filters";
import { UserManagementSummary } from "./user-management-summary";
import { UserManagementTable } from "./user-management-table";

export function UserManagementDashboard() {
  const users = useAdminUsersLite();

  return (
    <main className="min-h-dvh bg-[#f7fbff] text-[#172033]">
      <DashboardTopbar
        title="管理员控制台"
        showBackToDashboard
        showAdminLink={false}
        centerContent={<AdminNavTabs />}
        maxWidthClassName="max-w-[1440px]"
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <header className="rounded-[18px] border border-[#d9e5f2] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef6ff] text-[#1687f2] ring-1 ring-[#cfe3fb]">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
                    后台 / 账号治理
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0f172a]">用户管理</h1>
                  <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#52647e]">
                    查看用户、搜索账号、调整会员、限制账号、重置状态。
                  </p>
                </div>
              </div>
              <AdminNavTabs className="lg:hidden" />
            </div>
          </header>

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
        </div>
      </div>

      <UserDetailDrawer
        userId={users.selectedUserId}
        onClose={() => users.setSelectedUserId(null)}
      />
      <UserEditDialog controller={users} />
    </main>
  );
}

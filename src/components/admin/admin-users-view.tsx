"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

import { AdminUsersModals } from "./admin-users-modals";
import { AdminUsersTable } from "./admin-users-table";

type AdminUsersViewProps = {
  users: AdminUsersController;
};

export function AdminUsersView({ users }: AdminUsersViewProps) {
  return (
    <main className="theme-page relative min-h-screen overflow-x-hidden pb-24 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <div className="pointer-events-none fixed inset-0 theme-app-grid" />
      <div className="pointer-events-none fixed inset-0 theme-app-vignette" />
      <div className="pointer-events-none fixed inset-0 app-noise theme-app-noise" />

      <DashboardTopbar
        className="relative z-40"
        title="用户管理"
        userEmail={users.userEmail}
        isAdmin={users.isAdmin}
        showBackToDashboard
        backHref="/dashboard/admin"
        backLabel="返回管理台"
        showAdminLink={false}
        logoutLabel="退出"
        maxWidthClassName="max-w-[1400px]"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 pt-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="theme-heading text-3xl font-bold tracking-tight">后台账号管理</h1>
            <p className="theme-subheading mt-2 text-sm">
              说明：系统只保存加密后的 passwordHash，无法查询明文密码。你可以在列表里对指定账号“修改密码”（覆盖）或生成临时密码。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              返回管理台
            </Link>
            <button
              type="button"
              onClick={() => users.setCreateOpen(true)}
              className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold active:scale-95"
            >
              <Plus className="h-4 w-4" />
              新增用户
            </button>
          </div>
        </div>

        <AdminUsersTable users={users} />
      </div>

      <AdminUsersModals users={users} />
    </main>
  );
}

"use client";

import { ArrowLeft, Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { AppButton, AppCard } from "@/components/app-ui";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

import { AdminUsersModals } from "./admin-users-modals";
import { AdminUsersTable } from "./admin-users-table";

type AdminUsersViewProps = {
  users: AdminUsersController;
};

export function AdminUsersView({ users }: AdminUsersViewProps) {
  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />

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
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <AppCard className="mb-3 overflow-hidden bg-[var(--theme-surface-strong)]">
          <div className="grid gap-3 border-b border-[var(--theme-border)] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
                <UsersRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                  Admin Users
                </div>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-2xl">
                  后台账号管理
                </h1>
                <p className="mt-1 max-w-4xl truncate text-xs font-semibold text-[var(--theme-text-secondary)] sm:text-sm">
                  系统只保存加密后的 passwordHash；密码操作统一在弹窗中覆盖或生成临时密码。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <Link
                href="/dashboard/admin"
                className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                返回管理台
              </Link>
              <AppButton
                type="button"
                onClick={() => users.setCreateOpen(true)}
                className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                <Plus className="h-4 w-4" />
                新增用户
              </AppButton>
            </div>
          </div>
        </AppCard>

        <AdminUsersTable users={users} />
      </div>

      <AdminUsersModals users={users} />
    </main>
  );
}

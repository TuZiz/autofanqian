"use client";

import { RefreshCw, Search } from "lucide-react";

import {
  adminInputClassName,
  adminPanelClassName,
  adminSecondaryButtonClassName,
  adminSelectClassName,
} from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminEmailVerifiedFilter,
  AdminMembershipTierFilter,
  AdminUserRoleFilter,
  AdminUserSort,
  AdminUserStatusFilter,
} from "@/lib/admin/admin-user-types";
import type { AdminUsersLiteController } from "@/lib/admin/use-admin-users-lite";

const roleOptions: Array<{ label: string; value: AdminUserRoleFilter }> = [
  { label: "全部角色", value: "all" },
  { label: "user", value: "user" },
  { label: "admin", value: "admin" },
  { label: "super_admin", value: "super_admin" },
];

const statusOptions: Array<{ label: string; value: AdminUserStatusFilter }> = [
  { label: "全部状态", value: "all" },
  { label: "active", value: "active" },
  { label: "banned", value: "banned" },
  { label: "limited", value: "limited" },
  { label: "deleted", value: "deleted" },
];

const tierOptions: Array<{ label: string; value: AdminMembershipTierFilter }> = [
  { label: "全部会员", value: "all" },
  { label: "default", value: "default" },
  { label: "plus", value: "plus" },
  { label: "pro", value: "pro" },
  { label: "max", value: "max" },
];

const emailVerifiedOptions: Array<{ label: string; value: AdminEmailVerifiedFilter }> = [
  { label: "全部验证", value: "all" },
  { label: "已验证", value: "verified" },
  { label: "未验证", value: "unverified" },
];

const sortOptions: Array<{ label: string; value: AdminUserSort }> = [
  { label: "创建时间", value: "createdAt_desc" },
  { label: "最近登录", value: "lastLoginAt_desc" },
  { label: "更新时间", value: "updatedAt_desc" },
  { label: "生成任务数", value: "generationJobs_desc" },
  { label: "作品数", value: "works_desc" },
];

const takeOptions = [20, 50, 100] as const;

export function UserManagementFilters({ users }: { users: AdminUsersLiteController }) {
  return (
    <section className={`${adminPanelClassName} overflow-hidden p-3`}>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-3">
          <label className="relative w-[360px] shrink-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7084a3]" />
          <Input
            value={users.query}
            onChange={(event) => users.setQuery(event.target.value)}
            placeholder="搜索邮箱、昵称、用户编号"
            className={`${adminInputClassName} pl-11`}
          />
        </label>
        <Select value={users.role} onChange={(value) => users.setRole(value as AdminUserRoleFilter)} options={roleOptions} />
        <Select value={users.status} onChange={(value) => users.setStatus(value as AdminUserStatusFilter)} options={statusOptions} />
        <Select value={users.membershipTier} onChange={(value) => users.setMembershipTier(value as AdminMembershipTierFilter)} options={tierOptions} />
        <Select value={users.emailVerified} onChange={(value) => users.setEmailVerified(value as AdminEmailVerifiedFilter)} options={emailVerifiedOptions} />
        <Select value={users.sort} onChange={(value) => users.setSort(value as AdminUserSort)} options={sortOptions} />
        <select
          value={users.take}
          onChange={(event) => users.setTake(Number(event.target.value) as 20 | 50 | 100)}
          className={`${adminSelectClassName} w-[138px] shrink-0`}
        >
          {takeOptions.map((option) => (
            <option key={option} value={option}>
              {option} 条/页
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void users.refresh()}
          disabled={users.loading}
          className={adminSecondaryButtonClassName}
        >
          <RefreshCw className={users.loading ? "animate-spin" : ""} />
          刷新
        </Button>
        </div>
      </div>
    </section>
  );
}

function Select({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${adminSelectClassName} w-[150px] shrink-0`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

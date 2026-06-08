"use client";

import { Shield, UserCheck, UserPlus, Users } from "lucide-react";

import { AdminMetricCard } from "@/components/admin/admin-page-shell";
import { formatCompactNumber } from "@/lib/admin/admin-format";
import type { AdminUsersResponse } from "@/lib/admin/admin-user-types";

export function UserManagementSummary({ data }: { data: AdminUsersResponse | null }) {
  const summary = data?.summary;

  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        icon={Users}
        label="全部用户"
        value={formatCompactNumber(summary?.totalUsers ?? 0)}
        helper={`正常 ${summary?.activeUsers ?? 0} / 受限 ${summary?.limitedUsers ?? 0}`}
        tone="blue"
      />
      <AdminMetricCard
        icon={Shield}
        label="管理员"
        value={formatCompactNumber(summary?.adminUsers ?? 0)}
        helper={`封禁 ${summary?.bannedUsers ?? 0}`}
        tone="purple"
      />
      <AdminMetricCard
        icon={UserCheck}
        label="已验证邮箱"
        value={formatCompactNumber(summary?.verifiedUsers ?? 0)}
        helper={`付费会员 ${summary?.paidUsers ?? 0}`}
        tone="emerald"
      />
      <AdminMetricCard
        icon={UserPlus}
        label="今日新增"
        value={formatCompactNumber(summary?.todayNewUsers ?? 0)}
        helper="按中国时间统计"
        tone="sky"
      />
    </section>
  );
}

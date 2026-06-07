"use client";

import { Shield, UserCheck, UserPlus, Users } from "lucide-react";

import { formatCompactNumber } from "@/lib/admin/admin-format";
import type { AdminUsersResponse } from "@/lib/admin/admin-user-types";

export function UserManagementSummary({ data }: { data: AdminUsersResponse | null }) {
  const summary = data?.summary;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile
        icon={Users}
        label="全部用户"
        value={formatCompactNumber(summary?.totalUsers ?? 0)}
        helper={`正常 ${summary?.activeUsers ?? 0} / 受限 ${summary?.limitedUsers ?? 0}`}
      />
      <SummaryTile
        icon={Shield}
        label="管理员"
        value={formatCompactNumber(summary?.adminUsers ?? 0)}
        helper={`封禁 ${summary?.bannedUsers ?? 0}`}
      />
      <SummaryTile
        icon={UserCheck}
        label="已验证邮箱"
        value={formatCompactNumber(summary?.verifiedUsers ?? 0)}
        helper={`付费会员 ${summary?.paidUsers ?? 0}`}
      />
      <SummaryTile
        icon={UserPlus}
        label="今日新增"
        value={formatCompactNumber(summary?.todayNewUsers ?? 0)}
        helper="按本地日期统计"
      />
    </section>
  );
}

function SummaryTile({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#d9e5f2] bg-white p-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7b8ca5]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-[#0f172a]">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-[#52647e]">{helper}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-[#1687f2] ring-1 ring-[#cfe3fb]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

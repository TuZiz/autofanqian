"use client";

import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { AdminUsersView } from "@/components/admin/admin-users-view";
import { useAdminUsers } from "@/lib/admin/use-admin-users";

export default function DashboardAdminUsersPage() {
  const users = useAdminUsers();

  if (users.bootstrapLoading) {
    return <AdminStateScreen message="正在加载用户管理..." />;
  }

  return <AdminUsersView users={users} />;
}

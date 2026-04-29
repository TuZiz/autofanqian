"use client";

import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { DashboardAdminView } from "@/components/admin/dashboard-admin-view";
import { useDashboardAdmin } from "@/lib/admin/use-dashboard-admin";

export default function DashboardAdminPage() {
  const admin = useDashboardAdmin();

  if (admin.loading || !admin.config) {
    return (
      <AdminStateScreen
        message={admin.loading ? "正在加载控制台…" : "配置加载失败，请刷新重试。"}
      />
    );
  }

  return <DashboardAdminView admin={admin} />;
}

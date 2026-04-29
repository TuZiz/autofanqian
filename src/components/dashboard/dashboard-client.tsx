"use client";

import { DashboardDeleteDialog } from "@/components/dashboard/dashboard-delete-dialog";
import { DashboardLoadingScreen } from "@/components/dashboard/dashboard-loading-screen";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useDashboardClient } from "@/lib/dashboard/use-dashboard-client";

export function DashboardClient() {
  const dashboard = useDashboardClient();

  if (dashboard.loading) {
    return <DashboardLoadingScreen />;
  }

  return (
    <>
      <DashboardShell dashboard={dashboard} />
      <DashboardDeleteDialog dashboard={dashboard} />
    </>
  );
}

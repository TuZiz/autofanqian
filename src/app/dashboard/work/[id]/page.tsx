"use client";

import { useParams } from "next/navigation";

import { WorkDashboardView } from "@/components/workbench/work-dashboard-view";
import { WorkLoadingScreen } from "@/components/workbench/work-loading-screen";
import { useWorkDashboard } from "@/lib/workbench/use-work-dashboard";

export default function DashboardWorkPage() {
  const params = useParams();
  const workId = typeof params?.id === "string" ? params.id : "";
  const dashboard = useWorkDashboard(workId);

  if (dashboard.bootstrapLoading) {
    return <WorkLoadingScreen label="正在加载作品..." />;
  }

  return <WorkDashboardView dashboard={dashboard} />;
}

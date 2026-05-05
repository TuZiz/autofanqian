"use client";

import { useParams } from "next/navigation";

import { WorkDashboardView } from "@/components/workbench/work-dashboard-view";
import { WorkLoadingScreen } from "@/components/workbench/work-loading-screen";
import { useWorkDashboard } from "@/lib/workbench/use-work-dashboard";

export default function DashboardNovelPage() {
  const params = useParams();
  const novelId = typeof params?.id === "string" ? params.id : "";
  const dashboard = useWorkDashboard(novelId);

  if (dashboard.bootstrapLoading) {
    return <WorkLoadingScreen label="正在加载小说..." />;
  }

  return <WorkDashboardView dashboard={dashboard} />;
}

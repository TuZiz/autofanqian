"use client";

import { AdminJobsView } from "@/components/admin/admin-jobs-view";
import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { useAdminJobs } from "@/lib/admin/use-admin-jobs";

export default function DashboardAdminJobsPage() {
  const jobs = useAdminJobs();

  if (jobs.loading && !jobs.jobs.length) {
    return <AdminStateScreen message="正在加载后台任务..." />;
  }

  return <AdminJobsView jobs={jobs} />;
}

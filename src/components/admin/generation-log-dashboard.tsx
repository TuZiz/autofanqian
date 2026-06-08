"use client";

import { Activity } from "lucide-react";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { AdminHero, AdminPageShell } from "@/components/admin/admin-page-shell";
import { useGenerationLogs } from "@/lib/admin/use-generation-logs";

import { GenerationLogDetailDrawer } from "./generation-log-detail-drawer";
import { GenerationLogFilters } from "./generation-log-filters";
import { GenerationLogSummaryCard } from "./generation-log-summary-card";
import { GenerationLogTable } from "./generation-log-table";

export function GenerationLogDashboard() {
  const logs = useGenerationLogs();

  return (
    <AdminPageShell nav={<AdminNavTabs />}>
      <AdminHero
        icon={Activity}
        eyebrow="后台 / AI 生成观测"
        title="生成日志"
        description="查看 AI 生成任务、成功率、失败原因、模型调用与耗时表现。"
        refreshBusy={logs.loading}
        refreshLabel="刷新日志"
        onRefresh={() => void logs.refresh()}
      />

      {logs.error ? (
        <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {logs.error}
        </div>
      ) : null}

      <GenerationLogSummaryCard data={logs.data} />
      <GenerationLogFilters logs={logs} />
      <GenerationLogTable logs={logs} />

      <GenerationLogDetailDrawer
        jobId={logs.selectedJobId}
        onClose={() => logs.setSelectedJobId(null)}
      />
    </AdminPageShell>
  );
}

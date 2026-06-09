"use client";

import { Activity, Settings2 } from "lucide-react";
import { useState } from "react";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import {
  AdminHero,
  AdminPageShell,
  adminSecondaryButtonClassName,
} from "@/components/admin/admin-page-shell";
import { AiProviderSettingsDialog } from "@/components/admin/ai-provider-settings-dialog";
import { useGenerationLogs } from "@/lib/admin/use-generation-logs";
import { cn } from "@/lib/utils";

import { GenerationLogDetailDrawer } from "./generation-log-detail-drawer";
import { GenerationLogFilters } from "./generation-log-filters";
import { GenerationLogSummaryCard } from "./generation-log-summary-card";
import { GenerationLogTable } from "./generation-log-table";

export function GenerationLogDashboard() {
  const logs = useGenerationLogs();
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

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
        actions={
          <button
            type="button"
            className={cn(adminSecondaryButtonClassName, "inline-flex items-center justify-center gap-2")}
            onClick={() => setAiSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
            AI 配置
          </button>
        }
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
      <AiProviderSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
      />
    </AdminPageShell>
  );
}

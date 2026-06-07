"use client";

import { Activity } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { useGenerationLogs } from "@/lib/admin/use-generation-logs";

import { GenerationLogDetailDrawer } from "./generation-log-detail-drawer";
import { GenerationLogFilters } from "./generation-log-filters";
import { GenerationLogSummaryCard } from "./generation-log-summary-card";
import { GenerationLogTable } from "./generation-log-table";

export function GenerationLogDashboard() {
  const logs = useGenerationLogs();

  return (
    <main className="min-h-dvh bg-[#f7fbff] text-[#172033]">
      <DashboardTopbar
        title="管理员控制台"
        showBackToDashboard
        showAdminLink={false}
        centerContent={<AdminNavTabs />}
        maxWidthClassName="max-w-[1440px]"
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <header className="rounded-[18px] border border-[#d9e5f2] bg-white px-4 py-4 shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef6ff] text-[#1687f2] ring-1 ring-[#cfe3fb]">
                  <Activity className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
                    后台 / AI 生成观测
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0f172a]">生成日志</h1>
                  <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#52647e]">
                    查看 AI 生成任务、成功率、失败原因、模型调用与耗时表现。
                  </p>
                </div>
              </div>
              <AdminNavTabs className="lg:hidden" />
            </div>
          </header>

          {logs.error ? (
            <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {logs.error}
            </div>
          ) : null}

          <GenerationLogSummaryCard data={logs.data} />
          <GenerationLogFilters logs={logs} />
          <GenerationLogTable logs={logs} />
        </div>
      </div>

      <GenerationLogDetailDrawer
        jobId={logs.selectedJobId}
        onClose={() => logs.setSelectedJobId(null)}
      />
    </main>
  );
}

"use client";

import Link from "next/link";
import { Bot, ListFilter, Loader2, Play, RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/design-system";
import type { AdminGenerationJob, AdminJobsController, AdminJobStatus } from "@/lib/admin/use-admin-jobs";
import { cn } from "@/lib/utils";

import { AdminStatusPill } from "./admin-console-primitives";
import { AdminWorkspaceShell } from "./admin-workspace-shell";

const statusOptions: Array<{ value: AdminJobStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "queued", label: "排队" },
  { value: "running", label: "运行中" },
  { value: "succeeded", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "stale", label: "过期" },
];

const statusTone: Record<string, string> = {
  queued: "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] ring-[var(--theme-warning-border)]",
  running: "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-[var(--theme-brand-border)]",
  succeeded: "bg-[var(--theme-success-soft)] text-[var(--theme-success-text)] ring-[var(--theme-brand-border)]",
  success: "bg-[var(--theme-success-soft)] text-[var(--theme-success-text)] ring-[var(--theme-brand-border)]",
  failed: "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-[var(--theme-danger-border)]",
  stale: "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)] ring-[var(--theme-border)]",
};

export function AdminJobsView({ jobs }: { jobs: AdminJobsController }) {
  const queuedCount = jobs.countMap.get("queued") ?? 0;
  const runningCount = jobs.countMap.get("running") ?? 0;
  const failedCount = jobs.countMap.get("failed") ?? 0;

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "任务队列" }]}
      description="任务 / 后台执行器"
      icon={Bot}
      subtitle="查看排队、运行、成功和失败任务；可手动执行待处理任务，适合部署环境没有常驻 worker 时兜底。"
      title="AI 后台任务队列"
      userEmail=""
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone="neutral">排队 {queuedCount}</AdminStatusPill>
          <AdminStatusPill tone="brand">运行 {runningCount}</AdminStatusPill>
          <AdminStatusPill tone="danger">失败 {failedCount}</AdminStatusPill>
          <Button
            type="button"
            icon={RotateCcw}
            busy={jobs.autoRefresh}
            onClick={() => jobs.setAutoRefresh(!jobs.autoRefresh)}
            className="min-h-9 px-3"
          >
            自动刷新
          </Button>
          <Button
            type="button"
            icon={ListFilter}
            tone={jobs.executableOnly ? "primary" : "secondary"}
            onClick={() => jobs.setExecutableOnly(!jobs.executableOnly)}
            className="min-h-9 px-3"
          >
            只看可执行
          </Button>
          <Button
            type="button"
            icon={RefreshCw}
            busy={jobs.loading}
            onClick={() => void jobs.load()}
            className="min-h-9 px-3"
          >
            刷新
          </Button>
          <Button
            type="button"
            icon={Play}
            tone="primary"
            busy={jobs.running}
            onClick={() => void jobs.runPending()}
            className="min-h-9 px-3"
          >
            执行待处理
          </Button>
          <Button
            type="button"
            icon={Play}
            tone="ai"
            busy={jobs.running}
            onClick={() => void jobs.runCurrentFilter()}
            className="min-h-9 px-3"
          >
            执行当前筛选
          </Button>
        </div>
      }
    >
      {jobs.error ? <Notice tone="error">{jobs.error}</Notice> : null}
      {jobs.notice ? <Notice tone="success">{jobs.notice}</Notice> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => jobs.setStatus(option.value)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-black transition",
                jobs.status === option.value
                  ? "bg-[var(--theme-text-strong)] text-[var(--theme-surface-solid)]"
                  : "bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)] hover:text-[var(--theme-text-strong)]",
              )}
            >
              {option.label}
              {option.value !== "all" ? ` ${jobs.countMap.get(option.value) ?? 0}` : ""}
            </button>
          ))}
        </div>

        {jobs.loading && !jobs.jobs.length ? (
          <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-bold text-[var(--theme-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载任务...
          </div>
        ) : jobs.jobs.length ? (
          <div className="overflow-x-auto rounded-[20px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.88)] shadow-[var(--theme-shadow-card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--theme-divider)] text-xs font-black uppercase tracking-[0.12em] text-[var(--theme-text-muted)]">
                <tr>
                  <th className="px-4 py-3">任务</th>
                  <th className="px-4 py-3">作品</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.jobs.map((job) => (
                  <JobRow job={job} key={job.id} onRun={() => void jobs.runPending(job.id)} running={jobs.running} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center text-sm font-bold text-[var(--theme-text-muted)]">
            暂无任务。
          </div>
        )}
      </section>
    </AdminWorkspaceShell>
  );
}

function JobRow({
  job,
  onRun,
  running,
}: {
  job: AdminGenerationJob;
  onRun: () => void;
  running: boolean;
}) {
  const canRun = job.status === "queued" || job.status === "stale" || job.status === "failed";
  const staleWaiting = job.status === "stale";
  const stuckRunning = job.status === "running" && isOlderThanMinutes(job.heartbeatAt ?? job.startedAt, 30);
  const autoRetryStopped = job.failureCount >= 3;
  return (
    <tr className="border-b border-[var(--theme-divider)] align-top last:border-0">
      <td className="max-w-[360px] px-4 py-3">
        <div className="font-extrabold text-[var(--theme-text-strong)]">{job.jobType || job.action}</div>
        <div className="mt-1 truncate text-xs font-semibold text-[var(--theme-text-muted)]">{job.id}</div>
        {job.progress ? (
          <div className="mt-1 text-xs font-black text-[var(--theme-brand-text)]">
            分段进度 {job.progress.generatedSegments}/{job.progress.totalSegments ?? "-"}
          </div>
        ) : null}
        {job.failureCount ? (
          <div className="mt-1 text-xs font-bold text-[var(--theme-warning-text)]">
            连续失败 {job.failureCount} 次
          </div>
        ) : null}
        {autoRetryStopped ? (
          <StatusHint tone="warning">已停止自动重试</StatusHint>
        ) : null}
        {job.errorMessage ? (
          <div className="mt-2 max-w-[520px] whitespace-pre-wrap rounded-lg border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--theme-danger-text)]">
            {job.errorMessage}
          </div>
        ) : (
          <div className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--theme-text-secondary)]">
            {job.resultSummary || "暂无摘要"}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {job.novel ? (
          <Link href={`/dashboard/work/${encodeURIComponent(job.novel.id)}`} className="font-bold text-[var(--theme-text-strong)] hover:underline">
            {job.novel.title}
          </Link>
        ) : (
          <span className="text-[var(--theme-text-muted)]">作品已删除</span>
        )}
        <div className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
          {job.user?.email || "未知用户"}{job.chapterIndex ? ` · 第 ${job.chapterIndex} 章` : ""}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs font-black ring-1", statusTone[job.status] || statusTone.stale)}>
          {job.status}
        </span>
        {staleWaiting ? <StatusHint tone="info">等待恢复</StatusHint> : null}
        {stuckRunning ? <StatusHint tone="warning">可能已卡住</StatusHint> : null}
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[var(--theme-text-secondary)]">
        <div>总计 {job.totalTokens ?? 0}</div>
        <div>输入 {job.inputTokens ?? 0} / 输出 {job.outputTokens ?? 0}</div>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[var(--theme-text-secondary)]">
        <div>创建 {formatTime(job.createdAt)}</div>
        <div>心跳 {job.heartbeatAt ? formatTime(job.heartbeatAt) : "-"}</div>
        <div>最近耗时 {formatDuration(job.durationMs)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun || running}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-black text-[var(--theme-text-secondary)] disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" />
          {job.status === "failed" ? "重试" : "执行"}
        </button>
      </td>
    </tr>
  );
}

function StatusHint({ children, tone }: { children: React.ReactNode; tone: "info" | "warning" }) {
  return (
    <div
      className={cn(
        "mt-1 inline-flex rounded-md px-2 py-1 text-[11px] font-black ring-1",
        tone === "warning"
          ? "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] ring-[var(--theme-warning-border)]"
          : "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-[var(--theme-brand-border)]",
      )}
    >
      {children}
    </div>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  return (
    <div
      className={cn(
        "mb-3 rounded-lg border px-4 py-3 text-sm font-bold",
        tone === "error"
          ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]"
          : "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]",
      )}
    >
      {children}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(durationMs: number | null) {
  if (!durationMs) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}m ${restSeconds}s`;
}

function isOlderThanMinutes(value: string | null, minutes: number) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() > minutes * 60 * 1000;
}

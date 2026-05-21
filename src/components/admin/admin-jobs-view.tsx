"use client";

import Link from "next/link";
import { Bot, ListFilter, Loader2, Play, RefreshCw, RotateCcw } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AdminGenerationJob, AdminJobsController, AdminJobStatus } from "@/lib/admin/use-admin-jobs";
import { cn } from "@/lib/utils";

const statusOptions: Array<{ value: AdminJobStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "queued", label: "排队" },
  { value: "running", label: "运行中" },
  { value: "succeeded", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "stale", label: "过期" },
];

const statusTone: Record<string, string> = {
  queued: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20",
  running: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20",
  succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20",
  failed: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20",
  stale: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-white/8 dark:text-zinc-200 dark:ring-white/10",
};

export function AdminJobsView({ jobs }: { jobs: AdminJobsController }) {
  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <DashboardTopbar
        className="relative z-40"
        title="GenerationJob 执行器"
        showBackToDashboard
        backHref="/dashboard/admin"
        backLabel="返回管理台"
        showAdminLink={false}
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <section className="app-compact-panel mb-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="mb-2 inline-flex h-8 items-center gap-2 rounded-md bg-sky-50 px-2.5 text-xs font-black text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20">
                <Bot className="h-3.5 w-3.5" />
                Background Runner
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                AI 后台任务队列
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
                查看排队、运行、成功和失败任务；可手动执行待处理任务，适合部署环境没有常驻 worker 时兜底。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => jobs.setAutoRefresh(!jobs.autoRefresh)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
                  jobs.autoRefresh
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]",
                )}
              >
                <RotateCcw className={cn("h-4 w-4", jobs.autoRefresh && "animate-spin")} />
                自动刷新
              </button>
              <button
                type="button"
                onClick={() => jobs.setExecutableOnly(!jobs.executableOnly)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
                  jobs.executableOnly
                    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)]",
                )}
              >
                <ListFilter className="h-4 w-4" />
                只看可执行
              </button>
              <button
                type="button"
                onClick={() => void jobs.load()}
                disabled={jobs.loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-bold text-[var(--theme-text-secondary)] disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", jobs.loading && "animate-spin")} />
                刷新
              </button>
              <button
                type="button"
                onClick={() => void jobs.runPending()}
                disabled={jobs.running}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
              >
                {jobs.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                执行待处理
              </button>
              <button
                type="button"
                onClick={() => void jobs.runCurrentFilter()}
                disabled={jobs.running}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {jobs.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                执行当前筛选
              </button>
            </div>
          </div>
        </section>

        {jobs.error ? <Notice tone="error">{jobs.error}</Notice> : null}
        {jobs.notice ? <Notice tone="success">{jobs.notice}</Notice> : null}

        <section className="app-compact-panel overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-[var(--theme-divider)] p-3">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => jobs.setStatus(option.value)}
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-black transition",
                  jobs.status === option.value
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
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
            <div className="overflow-x-auto">
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
      </div>
    </main>
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
  return (
    <tr className="border-b border-[var(--theme-divider)] align-top last:border-0">
      <td className="max-w-[360px] px-4 py-3">
        <div className="font-extrabold text-[var(--theme-text-strong)]">{job.jobType || job.action}</div>
        <div className="mt-1 truncate text-xs font-semibold text-[var(--theme-text-muted)]">{job.id}</div>
        {job.progress ? (
          <div className="mt-1 text-xs font-black text-sky-600 dark:text-sky-300">
            分段进度 {job.progress.generatedSegments}/{job.progress.totalSegments ?? "-"}
          </div>
        ) : null}
        {job.failureCount ? (
          <div className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-300">
            连续失败 {job.failureCount} 次
          </div>
        ) : null}
        {job.errorMessage ? (
          <div className="mt-2 max-w-[520px] whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
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
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[var(--theme-text-secondary)]">
        <div>总计 {job.totalTokens ?? 0}</div>
        <div>输入 {job.inputTokens ?? 0} / 输出 {job.outputTokens ?? 0}</div>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[var(--theme-text-secondary)]">
        <div>创建 {formatTime(job.createdAt)}</div>
        <div>心跳 {job.heartbeatAt ? formatTime(job.heartbeatAt) : "-"}</div>
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

function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  return (
    <div
      className={cn(
        "mb-3 rounded-lg border px-4 py-3 text-sm font-bold",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
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

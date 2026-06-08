"use client";

import Link from "next/link";
import { Eye, Loader2, Search } from "lucide-react";

import {
  adminPanelClassName,
  adminSecondaryButtonClassName,
} from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatDuration,
  formatTokens,
  getGenerationStatusMeta,
} from "@/lib/admin/admin-format";
import type { GenerationLogListItem } from "@/lib/admin/generation-log-types";
import type { GenerationLogsController } from "@/lib/admin/use-generation-logs";
import { cn } from "@/lib/utils";

export function GenerationLogTable({ logs }: { logs: GenerationLogsController }) {
  if (logs.loading && !logs.jobs.length) {
    return (
      <div className={`${adminPanelClassName} flex min-h-[360px] items-center justify-center gap-2 text-sm font-bold text-[#7084a3]`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载生成日志...
      </div>
    );
  }

  if (!logs.jobs.length) {
    return (
      <div className={`${adminPanelClassName} flex min-h-[320px] flex-col items-center justify-center px-4 text-center`}>
        <Search className="h-8 w-8 text-[#8aa0bd]" />
        <p className="mt-3 text-sm font-black text-[#14213d]">没有匹配的生成任务</p>
        <p className="mt-1 text-xs font-semibold text-[#7084a3]">换个状态或关键词再试试。</p>
      </div>
    );
  }

  return (
    <section className={`${adminPanelClassName} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="border-b border-[#e7eef8] bg-[#fbfdff] text-[12px] font-black text-[#536889]">
            <tr>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4">action / jobType</th>
              <th className="px-6 py-4">作品 / 章节</th>
              <th className="px-6 py-4">用户邮箱</th>
              <th className="px-6 py-4">模型</th>
              <th className="px-6 py-4">Token</th>
              <th className="px-6 py-4">耗时</th>
              <th className="px-6 py-4">时间</th>
              <th className="px-6 py-4">错误摘要</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {logs.jobs.map((job) => (
              <GenerationLogRow
                key={job.id}
                job={job}
                onDetail={() => logs.setSelectedJobId(job.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {logs.nextCursor ? (
        <div className="border-t border-[#e7eef8] px-6 py-4 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => logs.loadMore()}
            disabled={logs.loadingMore}
            className={adminSecondaryButtonClassName}
          >
            {logs.loadingMore ? "加载中..." : "加载更多"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function GenerationLogRow({
  job,
  onDetail,
}: {
  job: GenerationLogListItem;
  onDetail: () => void;
}) {
  const statusMeta = getGenerationStatusMeta(job.status);
  const StatusIcon = statusMeta.icon;
  const errorText = job.errorMessage || job.error || "";

  return (
    <tr className="border-b border-[#e7eef8] align-middle last:border-0 hover:bg-[#fbfdff]">
      <td className="px-6 py-5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black",
            statusMeta.className,
          )}
        >
          {StatusIcon ? (
            <StatusIcon className={cn("h-3.5 w-3.5", job.status === "running" ? "animate-spin" : "")} />
          ) : null}
          {statusMeta.label}
        </span>
      </td>
      <td className="max-w-[210px] px-6 py-5">
        <p className="truncate font-black text-[#14213d]">{job.action}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#7084a3]">{job.jobType || "-"}</p>
      </td>
      <td className="max-w-[240px] px-6 py-5">
        {job.novel ? (
          <Link
            href={`/dashboard/novel/${encodeURIComponent(job.novel.id)}`}
            className="line-clamp-1 font-black text-[#14213d] hover:text-[#1f74ff]"
          >
            {job.novel.title}
          </Link>
        ) : (
          <span className="font-semibold text-[#7084a3]">作品已删除</span>
        )}
        <p className="mt-1 truncate text-xs font-semibold text-[#7084a3]">
          {job.chapterIndex ? `第 ${job.chapterIndex} 章` : "无章节"}
        </p>
      </td>
      <td className="max-w-[220px] px-6 py-5">
        <p className="truncate font-semibold text-[#14213d]">{job.user?.email || "未知用户"}</p>
      </td>
      <td className="max-w-[220px] px-6 py-5">
        <p className="truncate font-semibold text-[#14213d]">{job.modelUsed || "-"}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#7084a3]">
          {job.providerId || "-"}{job.routeId ? ` / ${job.routeId}` : ""}
        </p>
      </td>
      <td className="px-6 py-5 text-xs font-bold text-[#536889]">
        <p>总 {formatTokens(job.totalTokens)}</p>
        <p className="mt-1 text-[#7084a3]">
          入 {formatTokens(job.inputTokens)} / 出 {formatTokens(job.outputTokens)}
        </p>
      </td>
      <td className="px-6 py-5 text-sm font-bold text-[#536889]">
        {formatDuration(job.durationMs)}
      </td>
      <td className="min-w-[190px] px-6 py-5 text-xs font-bold text-[#536889]">
        <p>创建 {formatDateTime(job.createdAt)}</p>
        <p className="mt-1 text-[#7084a3]">完成 {formatDateTime(job.completedAt ?? job.finishedAt)}</p>
      </td>
      <td className="max-w-[280px] px-6 py-5">
        <p
          className={cn(
            "line-clamp-2 text-xs font-semibold leading-5",
            errorText ? "text-[#9f1d16]" : "text-[#7084a3]",
          )}
        >
          {errorText || job.resultSummary || "无错误"}
        </p>
      </td>
      <td className="px-6 py-5 text-right">
        <Button type="button" variant="outline" size="sm" onClick={onDetail} className="h-9 rounded-[8px] border-[#d9e6f5] bg-white px-3 font-black text-[#14213d] hover:bg-[#f7fbff]">
          <Eye className="h-4 w-4" />
          详情
        </Button>
      </td>
    </tr>
  );
}

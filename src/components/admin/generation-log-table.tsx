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
        <table className="w-full min-w-[1152px] table-fixed text-left text-[12px]">
          <colgroup>
            <col className="w-[82px]" />
            <col className="w-[184px]" />
            <col className="w-[208px]" />
            <col className="w-[194px]" />
            <col className="w-[76px]" />
            <col className="w-[172px]" />
            <col className="w-[250px]" />
            <col className="w-[88px]" />
          </colgroup>
          <thead className="border-b border-[#e7eef8] bg-[#fbfdff] text-[11px] font-black text-[#536889]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">状态</th>
              <th className="whitespace-nowrap px-3 py-2">任务</th>
              <th className="whitespace-nowrap px-3 py-2">作品用户</th>
              <th className="whitespace-nowrap px-3 py-2">模型消耗</th>
              <th className="whitespace-nowrap px-3 py-2">耗时</th>
              <th className="whitespace-nowrap px-3 py-2">时间</th>
              <th className="whitespace-nowrap px-3 py-2">错误摘要</th>
              <th className="sticky right-0 z-20 whitespace-nowrap bg-[#fbfdff] px-2 py-2 text-right shadow-[-10px_0_18px_rgba(255,255,255,0.9)]">
                操作
              </th>
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
        <div className="border-t border-[#e7eef8] px-4 py-3 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => logs.loadMore()}
            disabled={logs.loadingMore}
            className={`${adminSecondaryButtonClassName} h-8 px-3 text-xs`}
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
  const chapterLabel = job.chapterIndex === null ? "无章节" : `第 ${job.chapterIndex} 章`;
  const userEmail = job.user?.email || "未知用户";
  const modelLabel = job.modelUsed || "-";
  const modelMeta = [job.providerId, job.routeId].filter(Boolean).join(" / ");
  const tokenSummary = `总 ${formatTokens(job.totalTokens)} / 入 ${formatTokens(job.inputTokens)} / 出 ${formatTokens(job.outputTokens)}`;

  return (
    <tr className="group border-b border-[#e7eef8] align-middle last:border-0 hover:bg-[#fbfdff]">
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex h-6 max-w-full items-center gap-1 rounded-none border px-2 text-[11px] font-black leading-none",
            statusMeta.className,
          )}
        >
          {StatusIcon ? (
            <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", job.status === "running" ? "animate-spin" : "")} />
          ) : null}
          <span className="truncate">{statusMeta.label}</span>
        </span>
      </td>
      <td className="px-3 py-2">
        <p className="truncate text-[13px] font-black leading-5 text-[#14213d]" title={job.action}>
          {job.action}
        </p>
        <p className="truncate text-[11px] font-semibold leading-4 text-[#7084a3]" title={job.jobType || "-"}>
          {job.jobType || "-"}
        </p>
      </td>
      <td className="px-3 py-2">
        {job.novel ? (
          <Link
            href={`/dashboard/novel/${encodeURIComponent(job.novel.id)}`}
            className="block truncate text-[13px] font-black leading-5 text-[#14213d] hover:text-[#1f74ff]"
            title={`${job.novel.title} / ${chapterLabel}`}
          >
            {job.novel.title} / {chapterLabel}
          </Link>
        ) : (
          <span className="block truncate text-[13px] font-semibold leading-5 text-[#7084a3]">
            作品已删除 / {chapterLabel}
          </span>
        )}
        <p className="truncate text-[11px] font-semibold leading-4 text-[#7084a3]" title={userEmail}>
          {userEmail}
        </p>
      </td>
      <td className="px-3 py-2">
        <p className="truncate text-[12px] font-semibold leading-5 text-[#14213d]" title={modelMeta ? `${modelLabel} / ${modelMeta}` : modelLabel}>
          {modelLabel}
        </p>
        <p className="truncate text-[11px] font-bold leading-4 text-[#536889]" title={tokenSummary}>
          {tokenSummary}
        </p>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-[12px] font-bold text-[#536889]">
        {formatDuration(job.durationMs)}
      </td>
      <td className="px-3 py-2 text-[11px] font-bold leading-4 text-[#536889]">
        <p className="truncate" title={`创建 ${formatDateTime(job.createdAt)}`}>
          创建 {formatDateTime(job.createdAt)}
        </p>
        <p className="truncate text-[#7084a3]" title={`完成 ${formatDateTime(job.completedAt ?? job.finishedAt)}`}>
          完成 {formatDateTime(job.completedAt ?? job.finishedAt)}
        </p>
      </td>
      <td className="px-3 py-2">
        <p
          className={cn(
            "line-clamp-2 break-words text-[12px] font-semibold leading-5",
            errorText ? "text-[#9f1d16]" : "text-[#7084a3]",
          )}
          title={errorText || job.resultSummary || "无错误"}
        >
          {errorText || job.resultSummary || "无错误"}
        </p>
      </td>
      <td className="sticky right-0 z-10 bg-white px-2 py-2 text-right shadow-[-10px_0_18px_rgba(255,255,255,0.9)] group-hover:bg-[#fbfdff]">
        <Button type="button" variant="outline" size="sm" onClick={onDetail} className="h-7 rounded-none border-[#d9e6f5] bg-white px-2 text-[11px] font-black text-[#14213d] hover:bg-[#f7fbff]">
          <Eye className="h-3.5 w-3.5" />
          详情
        </Button>
      </td>
    </tr>
  );
}

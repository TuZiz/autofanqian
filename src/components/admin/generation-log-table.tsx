"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";

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
      <div className="flex min-h-[360px] items-center justify-center gap-2 rounded-[18px] border border-[#d9e5f2] bg-white text-sm font-bold text-[#7b8ca5]">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载生成日志...
      </div>
    );
  }

  if (!logs.jobs.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[18px] border border-[#d9e5f2] bg-white px-4 text-center shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
        <Search className="h-8 w-8 text-[#9badc2]" />
        <p className="mt-3 text-sm font-black text-[#172033]">没有匹配的生成任务</p>
        <p className="mt-1 text-xs font-semibold text-[#7b8ca5]">换个状态或关键词再试试。</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#d9e5f2] bg-white shadow-[0_18px_48px_rgba(15,64,116,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className="border-b border-[#eef3f8] bg-[#f8fbff] text-[11px] font-black uppercase tracking-[0.12em] text-[#7b8ca5]">
            <tr>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">action / jobType</th>
              <th className="px-4 py-3">作品 / 章节</th>
              <th className="px-4 py-3">用户邮箱</th>
              <th className="px-4 py-3">模型</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">耗时</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">错误摘要</th>
              <th className="px-4 py-3 text-right">操作</th>
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
        <div className="border-t border-[#eef3f8] px-4 py-3 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => logs.loadMore()}
            disabled={logs.loadingMore}
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
    <tr className="border-b border-[#eef3f8] align-top last:border-0 hover:bg-[#fbfdff]">
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
            statusMeta.className,
          )}
        >
          {StatusIcon ? (
            <StatusIcon className={cn("h-3.5 w-3.5", job.status === "running" ? "animate-spin" : "")} />
          ) : null}
          {statusMeta.label}
        </span>
      </td>
      <td className="max-w-[190px] px-4 py-3">
        <p className="truncate font-black text-[#172033]">{job.action}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#7b8ca5]">{job.jobType || "-"}</p>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        {job.novel ? (
          <Link
            href={`/dashboard/novel/${encodeURIComponent(job.novel.id)}`}
            className="line-clamp-1 font-black text-[#172033] hover:text-[#1687f2]"
          >
            {job.novel.title}
          </Link>
        ) : (
          <span className="font-semibold text-[#7b8ca5]">作品已删除</span>
        )}
        <p className="mt-1 truncate text-xs font-semibold text-[#7b8ca5]">
          {job.chapterIndex ? `第 ${job.chapterIndex} 章` : "无章节"}
        </p>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <p className="truncate font-semibold text-[#172033]">{job.user?.email || "未知用户"}</p>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <p className="truncate font-semibold text-[#172033]">{job.modelUsed || "-"}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#7b8ca5]">
          {job.providerId || "-"}{job.routeId ? ` / ${job.routeId}` : ""}
        </p>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        <p>总 {formatTokens(job.totalTokens)}</p>
        <p className="mt-1 text-[#7b8ca5]">
          入 {formatTokens(job.inputTokens)} / 出 {formatTokens(job.outputTokens)}
        </p>
      </td>
      <td className="px-4 py-3 text-xs font-bold text-[#52647e]">
        {formatDuration(job.durationMs)}
      </td>
      <td className="min-w-[170px] px-4 py-3 text-xs font-bold text-[#52647e]">
        <p>创建 {formatDateTime(job.createdAt)}</p>
        <p className="mt-1 text-[#7b8ca5]">完成 {formatDateTime(job.completedAt ?? job.finishedAt)}</p>
      </td>
      <td className="max-w-[260px] px-4 py-3">
        <p
          className={cn(
            "line-clamp-2 text-xs font-semibold leading-5",
            errorText ? "text-[#9f1d16]" : "text-[#7b8ca5]",
          )}
        >
          {errorText || job.resultSummary || "无错误"}
        </p>
      </td>
      <td className="px-4 py-3 text-right">
        <Button type="button" variant="outline" size="sm" onClick={onDetail}>
          查看详情
        </Button>
      </td>
    </tr>
  );
}

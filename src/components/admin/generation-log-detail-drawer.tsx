"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";

import {
  formatDateTime,
  formatDuration,
  formatTokens,
  getGenerationStatusMeta,
} from "@/lib/admin/admin-format";
import { useGenerationLogDetail } from "@/lib/admin/use-generation-log-detail";
import { cn } from "@/lib/utils";

const JSON_PREVIEW_CHAR_LIMIT = 12_000;

export function GenerationLogDetailDrawer({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}) {
  const detail = useGenerationLogDetail(jobId);
  const job = detail.data?.job ?? null;
  const [copied, setCopied] = useState<string | null>(null);
  const statusMeta = getGenerationStatusMeta(job?.status ?? "");
  const StatusIcon = statusMeta.icon;
  const resultJsonText = useMemo(() => stringifyJson(job?.resultJson), [job?.resultJson]);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="关闭详情"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[18px] border border-[#d9e5f2] bg-white shadow-[0_-24px_70px_rgba(15,64,116,0.18)] md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[520px] md:rounded-none">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-[#eef3f8] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
                生成任务详情
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-[#172033]">
                {job?.action || "加载中"}
              </h2>
              {job ? (
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                    statusMeta.className,
                  )}
                >
                  {StatusIcon ? (
                    <StatusIcon className={cn("h-3.5 w-3.5", job.status === "running" ? "animate-spin" : "")} />
                  ) : null}
                  {statusMeta.label}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f3f7fc] hover:text-[#172033]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {detail.loading ? (
              <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm font-bold text-[#7b8ca5]">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载详情...
              </div>
            ) : detail.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {detail.error}
              </div>
            ) : job ? (
              <div className="space-y-4">
                <DetailSection title="基础信息">
                  <InfoGrid
                    items={[
                      ["任务 ID", job.id],
                      ["用户邮箱", job.user?.email ?? "-"],
                      ["用户 ID", job.user?.id ?? "-"],
                      ["作品 ID", job.novel?.id ?? "-"],
                      ["作品标题", job.novel?.title ?? "-"],
                      ["作品类型", job.novel?.workType ?? "-"],
                      ["章节 ID", job.chapter?.id ?? "-"],
                      ["章节序号", job.chapter?.index ? String(job.chapter.index) : "-"],
                    ]}
                  />
                </DetailSection>

                <DetailSection title="调用信息">
                  <InfoGrid
                    items={[
                      ["action", job.action],
                      ["jobType", job.jobType ?? "-"],
                      ["status", job.status],
                      ["routeId", job.routeId ?? "-"],
                      ["providerId", job.providerId ?? "-"],
                      ["modelUsed", job.modelUsed ?? "-"],
                      ["promptTemplateKey", job.promptTemplateKey ?? "-"],
                      ["promptTemplateVersion", job.promptTemplateVersion?.toString() ?? "-"],
                    ]}
                  />
                </DetailSection>

                <DetailSection title="结果与错误">
                  <InfoGrid
                    items={[
                      ["resultSummary", job.resultSummary ?? "-"],
                      ["error", job.error ?? "-"],
                      ["errorMessage", job.errorMessage ?? "-"],
                      ["progress", job.progress ? JSON.stringify(job.progress) : "-"],
                      ["failureCount", String(job.failureCount)],
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Token 与耗时">
                  <InfoGrid
                    items={[
                      ["inputTokens", formatTokens(job.inputTokens)],
                      ["outputTokens", formatTokens(job.outputTokens)],
                      ["totalTokens", formatTokens(job.totalTokens)],
                      ["durationMs", formatDuration(job.durationMs)],
                    ]}
                  />
                </DetailSection>

                <DetailSection title="时间">
                  <InfoGrid
                    items={[
                      ["createdAt", formatDateTime(job.createdAt)],
                      ["startedAt", formatDateTime(job.startedAt)],
                      ["heartbeatAt", formatDateTime(job.heartbeatAt)],
                      ["finishedAt", formatDateTime(job.finishedAt)],
                      ["completedAt", formatDateTime(job.completedAt)],
                    ]}
                  />
                </DetailSection>

                {job.promptSnapshot ? (
                  <CollapsibleBlock
                    title="promptSnapshot"
                    action={
                      <CopyButton
                        copied={copied === "prompt"}
                        onClick={() => void copyText("prompt", job.promptSnapshot?.slice(0, 3000) ?? "")}
                      />
                    }
                  >
                    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f172a] p-3 text-xs leading-5 text-[#e5eefb]">
                      {job.promptSnapshot.slice(0, 3000)}
                    </pre>
                  </CollapsibleBlock>
                ) : null}

                {resultJsonText ? (
                  <CollapsibleBlock title="resultJson">
                    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f172a] p-3 text-xs leading-5 text-[#e5eefb]">
                      {truncateForDisplay(resultJsonText)}
                    </pre>
                  </CollapsibleBlock>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[#d9e5f2] bg-[#fbfdff] p-3">
      <h3 className="text-xs font-black text-[#172033]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-lg bg-white px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="text-xs font-black text-[#7b8ca5]">{label}</dt>
          <dd className="min-w-0 break-words text-xs font-semibold leading-5 text-[#172033]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CollapsibleBlock({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <details className="rounded-xl border border-[#d9e5f2] bg-[#fbfdff] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-[#172033]">
        <span>{title}</span>
        {action}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function CopyButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-[#d9e5f2] bg-white px-2 text-[11px] font-bold text-[#52647e] hover:bg-[#f3f7fc]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function stringifyJson(value: unknown) {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateForDisplay(value: string) {
  if (value.length <= JSON_PREVIEW_CHAR_LIMIT) return value;
  return `${value.slice(0, JSON_PREVIEW_CHAR_LIMIT)}\n\n...已截断，仅展示前 ${JSON_PREVIEW_CHAR_LIMIT} 个字符。`;
}

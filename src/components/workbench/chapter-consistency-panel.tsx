"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import type {
  ChapterConsistencyIssue,
  ChapterConsistencyResult,
} from "@/shared/schemas/chapter-consistency";

import { CollapsiblePanel } from "./chapter-editor-sidebar-panels";

const severityCopy: Record<ChapterConsistencyIssue["severity"], string> = {
  high: "高危",
  medium: "中危",
  low: "低危",
};

const typeCopy: Record<ChapterConsistencyIssue["type"], string> = {
  character: "角色",
  timeline: "时间线",
  setting: "设定",
  plot: "剧情",
  style: "风格",
  other: "其他",
};

const severityClass: Record<ChapterConsistencyIssue["severity"], string> = {
  high:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  low:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
};

function countIssues(result: ChapterConsistencyResult | null) {
  return {
    high: result?.issues.filter((issue) => issue.severity === "high").length ?? 0,
    medium: result?.issues.filter((issue) => issue.severity === "medium").length ?? 0,
    low: result?.issues.filter((issue) => issue.severity === "low").length ?? 0,
  };
}

export function ChapterConsistencyPanel({
  editor,
  expanded,
  onToggle,
}: {
  editor: WorkChapterEditorController;
  expanded: boolean;
  onToggle: () => void;
}) {
  const {
    consistencyBlockedReason,
    consistencyBusy,
    consistencyError,
    consistencyResult,
    consistencyScope,
    handleRunConsistencyCheck,
    setConsistencyScope,
    work,
  } = editor;

  const issueCounts = useMemo(
    () => countIssues(consistencyResult),
    [consistencyResult],
  );
  const hasIssues = Boolean(consistencyResult?.issues.length);

  return (
    <CollapsiblePanel
      action={
        <button
          type="button"
          onClick={() => void handleRunConsistencyCheck()}
          disabled={!work || consistencyBusy}
          title={consistencyBlockedReason || "检查角色、时间线、设定、剧情和风格一致性"}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            consistencyError
              ? "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)]"
              : "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] hover:bg-[var(--theme-brand-subtle)]",
          )}
        >
          {consistencyBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : consistencyError ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <SearchCheck className="h-3.5 w-3.5" />
          )}
          {consistencyBusy ? "检查中" : "检查"}
        </button>
      }
      expanded={expanded}
      icon={ShieldCheck}
      onToggle={onToggle}
      subtitle="角色、时间线、设定与风格"
      title="一致性检查"
    >
      <div className="space-y-3">
        {consistencyError ? (
          <div className="rounded-lg border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--theme-danger-text)]">
            {consistencyError}
          </div>
        ) : null}

        {!consistencyResult && !consistencyBusy ? (
          <div className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-3 text-xs leading-5 text-[var(--theme-text-secondary)]">
            运行后会显示总分、风险数量和逐条修改建议。检查只读，不会自动改正文。
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-[var(--theme-surface-solid)] p-1 ring-1 ring-[var(--theme-border)]">
          {[
            { label: "当前章", value: "current" as const },
            { label: "最近 5 章", value: "recent5" as const },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setConsistencyScope(item.value)}
              disabled={consistencyBusy}
              className={cn(
                "h-8 rounded-md text-xs font-black transition disabled:opacity-50",
                consistencyScope === item.value
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-strong)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {consistencyBusy ? (
          <div className="rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--theme-text-secondary)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI 正在审校当前章节
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--theme-surface-solid)]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--theme-brand-500)]" />
            </div>
          </div>
        ) : null}

        {consistencyResult ? (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              <MetricTile
                label="总分"
                value={`${consistencyResult.score}`}
                tone={consistencyResult.score >= 85 ? "good" : consistencyResult.score >= 65 ? "warn" : "bad"}
              />
              <MetricTile label="高危" value={`${issueCounts.high}`} tone="bad" />
              <MetricTile label="中危" value={`${issueCounts.medium}`} tone="warn" />
              <MetricTile label="低危" value={`${issueCounts.low}`} tone="info" />
            </div>

            {!hasIssues ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                暂未发现明显一致性问题，可以继续写作或进行人工复核。
              </div>
            ) : (
              <div className="space-y-2">
                {consistencyResult.severeProblems?.length ? (
                  <ProblemBlock title="高危问题" tone="bad" items={consistencyResult.severeProblems} />
                ) : null}
                {consistencyResult.mediumProblems?.length ? (
                  <ProblemBlock title="中危问题" tone="warn" items={consistencyResult.mediumProblems} />
                ) : null}
                {consistencyResult.issues.map((issue, index) => (
                  <IssueItem
                    issue={issue}
                    key={`${issue.severity}-${issue.type}-${issue.title}-${index}`}
                  />
                ))}
                {consistencyResult.suggestions?.length ? (
                  <ProblemBlock title="修改建议" tone="info" items={consistencyResult.suggestions} />
                ) : null}
                {consistencyResult.autoFixPrompt ? (
                  <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-3">
                    <div className="mb-1 text-xs font-black text-[var(--theme-text-strong)]">
                      后续改写提示词
                    </div>
                    <p className="text-xs leading-5 text-[var(--theme-text-secondary)]">
                      {consistencyResult.autoFixPrompt}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </div>
    </CollapsiblePanel>
  );
}

function ProblemBlock({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "bad" | "warn" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "bad" && "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
      )}
    >
      <div className="mb-1 text-xs font-black">{title}</div>
      <ul className="space-y-1 text-xs leading-5">
        {items.slice(0, 6).map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "info";
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 py-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[var(--theme-text-muted)]">
        <Gauge className="h-3 w-3" />
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-black tabular-nums",
          tone === "good" && "text-emerald-600 dark:text-emerald-300",
          tone === "warn" && "text-amber-600 dark:text-amber-300",
          tone === "bad" && "text-red-600 dark:text-red-300",
          tone === "info" && "text-sky-600 dark:text-sky-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: ChapterConsistencyIssue }) {
  return (
    <article className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-bold",
            severityClass[issue.severity],
          )}
        >
          {severityCopy[issue.severity]}
        </span>
        <span className="inline-flex h-5 items-center rounded-full bg-[var(--theme-surface-solid)] px-2 text-[10px] font-bold text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
          {typeCopy[issue.type]}
        </span>
      </div>
      <h4 className="text-sm font-bold leading-5 text-[var(--theme-text-strong)]">
        {issue.title}
      </h4>
      <p className="mt-2 text-xs leading-5 text-[var(--theme-text-secondary)]">
        {issue.description}
      </p>
      <div className="mt-2 rounded-md bg-[var(--theme-surface-solid)] px-2.5 py-2 text-xs leading-5 text-[var(--theme-text-secondary)] ring-1 ring-[var(--theme-border)]">
        <span className="font-bold text-[var(--theme-text-strong)]">建议：</span>
        {issue.suggestion}
      </div>
    </article>
  );
}

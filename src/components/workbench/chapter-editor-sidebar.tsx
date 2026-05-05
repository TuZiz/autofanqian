"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  FileText,
  ListChecks,
  Maximize2,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { aiZhCN, getAiMetaCopy } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

type SidebarSectionKey = "target" | "summary" | "outline" | "details";

const rewriteQuickActions = [
  { action: "polish", label: aiZhCN.chapterRewrite.actions.polish.label },
  { action: "expand", label: aiZhCN.chapterRewrite.actions.expand.label },
  { action: "compress", label: aiZhCN.chapterRewrite.actions.compress.label },
  { action: "conflict", label: "冲突" },
  { action: "logic_check", label: "检查" },
] as const;

export function ChapterEditorSidebar({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterIndex,
    chapterOutlineText,
    chapterSummary,
    currentChapterEdited,
    detailsBusy,
    detailsActionError,
    detailsProgressPercent,
    detailsText,
    handleExtractDetails,
    handleGenerateSummary,
    handleOutlineActionClick,
    metaSaving,
    openRewriteDialog,
    openMetaEditor,
    outlineActionLabel,
    outlineActionError,
    outlineBusy,
    outlinePreviewLines,
    outlineProgressPercent,
    saving,
    summaryBusy,
    summaryActionError,
    summaryProgressPercent,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    title,
    updateDetailsText,
    updateOutlineText,
    updateSummary,
    work,
    workId,
  } = editor;
  const currentChapterLabel = formatChapterLabel(chapterIndex);
  const [expandedSections, setExpandedSections] = useState<Record<SidebarSectionKey, boolean>>({
    target: false,
    summary: false,
    outline: false,
    details: false,
  });

  const toggleSection = (section: SidebarSectionKey) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <aside className="min-w-0 lg:col-span-4 lg:h-full lg:self-stretch xl:col-span-3">
      <div className="chapter-editor-sidebar-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-100/[0.08] bg-white/72 shadow-sm shadow-zinc-900/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/52 dark:shadow-black/20 lg:min-h-[1180px] xl:min-h-[1320px]">
        <div className="flex-1 space-y-3 p-3">
          <section className="rounded-xl border border-zinc-100/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                  上下文工具
                </p>
                <h2 className="mt-1 truncate text-base font-black text-zinc-950 dark:text-zinc-50">
                  {currentChapterLabel}
                </h2>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[10px] font-black ring-1",
                  currentChapterEdited
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20"
                    : "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20",
                )}
              >
                {currentChapterEdited ? "已写" : "待写"}
              </span>
            </div>
            <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-300">
              {title || "未命名章节"} · 摘要、大纲与细节设定会作为本章写作上下文。
            </p>
          </section>

          <section className="rounded-xl border border-zinc-100/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <div className="min-w-0">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  AI 改写
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  先预览，再应用；应用前自动保存历史版本。
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {rewriteQuickActions.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => openRewriteDialog(item.action)}
                  disabled={!work || rewriteBusy || rewriteApplying}
                  title={rewriteBlockedReason || undefined}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <CollapsiblePanel
            action={
              <button
                type="button"
                onClick={handleOutlineActionClick}
                disabled={!work || outlineBusy || saving}
                title={outlineActionError || undefined}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  outlineActionError
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200/70 hover:bg-red-100 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-300/20 dark:hover:bg-red-400/15"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1]",
                )}
              >
                {outlineActionError ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {outlineActionError || outlineActionLabel}
              </button>
            }
            expanded={expandedSections.target}
            icon={BookOpen}
            onToggle={() => toggleSection("target")}
            subtitle={`绑定：${title || currentChapterLabel}`}
            title="本章目标"
          >
            <div className="space-y-2">
              {(outlinePreviewLines.length
                ? outlinePreviewLines
                : ["生成章节大纲后，这里会显示本章目标、冲突、信息点和结尾钩子。"]
              ).map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200/70 dark:bg-white/[0.035] dark:ring-white/10"
                >
                  <div className="mb-1 text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400">
                    {["目标", "冲突", "信息点", "结尾钩子"][index] ?? `节点 ${index + 1}`}
                  </div>
                  <p className="line-clamp-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </CollapsiblePanel>

          <MetaTextareaCard
            actionIcon={Sparkles}
            actionLabel={
              summaryBusy
                ? `${getAiMetaCopy("summary").generating} ${summaryProgressPercent}%`
                : getAiMetaCopy("summary").generate
            }
            actionError={summaryActionError}
            disabled={!work || summaryBusy || saving}
            expanded={expandedSections.summary}
            icon={FileText}
            onAction={() => void handleGenerateSummary()}
            onExpand={() => openMetaEditor("summary")}
            onToggle={() => toggleSection("summary")}
            onValueChange={updateSummary}
            placeholder="生成摘要，或手动整理关键冲突、转折和承接..."
            rows={11}
            subtitle="摘要与承接"
            title="章节摘要"
            value={chapterSummary}
          />

          <MetaTextareaCard
            actionIcon={ListChecks}
            actionLabel={
              outlineBusy
                ? `${getAiMetaCopy("outline").generating} ${outlineProgressPercent}%`
                : getAiMetaCopy("outline").generate
            }
            actionError={outlineActionError}
            disabled={!work || outlineBusy || saving}
            expanded={expandedSections.outline}
            icon={ListChecks}
            onAction={handleOutlineActionClick}
            onExpand={() => openMetaEditor("outline")}
            onToggle={() => toggleSection("outline")}
            onValueChange={updateOutlineText}
            placeholder="生成大纲，或手动列出本章关键节点、节奏和钩子..."
            rows={11}
            subtitle="章节节点"
            title="章节大纲"
            value={chapterOutlineText}
          />

          <CollapsiblePanel
            action={
              <>
                <button
                  type="button"
                  onClick={() => void handleExtractDetails()}
                  disabled={!work || detailsBusy || saving}
                  title={detailsActionError || undefined}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    detailsActionError
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200/70 hover:bg-red-100 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-300/20 dark:hover:bg-red-400/15"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:hover:bg-blue-400/15",
                  )}
                >
                  {detailsActionError ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {detailsActionError ||
                    (detailsBusy
                      ? `${getAiMetaCopy("details").generating} ${detailsProgressPercent}%`
                      : getAiMetaCopy("details").generate)}
                </button>
                <button
                  type="button"
                  onClick={() => openMetaEditor("details")}
                  disabled={!work || metaSaving}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-zinc-100 px-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1]"
                  title="打开编辑窗口"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  编辑
                </button>
              </>
            }
            expanded={expandedSections.details}
            icon={Settings2}
            onToggle={() => toggleSection("details")}
            subtitle="人物、道具、时间线"
            title="细节设定"
          >
            <textarea
              value={detailsText}
              onChange={(event) => updateDetailsText(event.target.value)}
              rows={11}
              disabled={!work || detailsBusy || saving}
              placeholder="一行一条设定：人物关系、关键道具、时间线、能力规则... 用于防止前后矛盾。"
              className="w-full resize-y rounded-lg bg-zinc-50 px-3 py-3 text-sm leading-7 text-zinc-600 outline-none ring-1 ring-zinc-200/70 transition focus:bg-white focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-zinc-300 dark:ring-white/10 dark:focus:bg-white/[0.06] dark:focus:ring-blue-300/30"
            />
          </CollapsiblePanel>

          <div className="shrink-0 border-t border-zinc-100/[0.06] bg-white/82 p-2.5 dark:border-white/10 dark:bg-zinc-950/35">
            <Link
              href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-100/[0.08] bg-white px-3 py-2.5 text-sm font-black text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回作品看板
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CollapsiblePanel({
  action,
  children,
  expanded,
  icon: Icon,
  onToggle,
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  expanded: boolean;
  icon: LucideIcon;
  onToggle: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-100/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-50/80" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-zinc-900 dark:text-zinc-100">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {expanded ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function MetaTextareaCard({
  actionIcon: ActionIcon,
  actionError,
  actionLabel,
  disabled,
  expanded,
  icon: Icon,
  onAction,
  onExpand,
  onToggle,
  onValueChange,
  placeholder,
  rows,
  subtitle,
  title,
  value,
}: {
  actionIcon: LucideIcon;
  actionError?: string;
  actionLabel: string;
  disabled: boolean;
  expanded: boolean;
  icon: LucideIcon;
  onAction: () => void;
  onExpand: () => void;
  onToggle: () => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  rows: number;
  subtitle?: string;
  title: string;
  value: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-100/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-50/80" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-zinc-900 dark:text-zinc-100">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            title={actionError || undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              actionError
                ? "bg-red-50 text-red-700 ring-1 ring-red-200/70 hover:bg-red-100 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-300/20 dark:hover:bg-red-400/15"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:hover:bg-blue-400/15",
            )}
          >
            {actionError ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <ActionIcon className="h-3.5 w-3.5" />
            )}
            <span className="max-w-[5.5rem] truncate">{actionError || actionLabel}</span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-zinc-100 px-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.1]"
            title="打开编辑窗口"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            编辑
          </button>
        </div>
      </div>
      {expanded ? (
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          className="mt-3 w-full resize-y rounded-lg bg-zinc-50 px-3 py-3 text-sm leading-7 text-zinc-600 outline-none ring-1 ring-zinc-200/70 transition focus:bg-white focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-zinc-300 dark:ring-white/10 dark:focus:bg-white/[0.06] dark:focus:ring-blue-300/30"
        />
      ) : null}
    </section>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

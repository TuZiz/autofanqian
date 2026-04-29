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

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

type SidebarSectionKey = "target" | "summary" | "outline" | "details";

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
      <div className="chapter-editor-sidebar-panel flex h-full min-h-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-900/[0.08] bg-white/72 shadow-sm shadow-slate-900/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/52 dark:shadow-black/20 xl:min-h-[1320px]">
        <div className="flex-1 space-y-3 p-3">
          <section className="rounded-xl border border-slate-900/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500">
                  上下文工具
                </p>
                <h2 className="mt-1 truncate text-base font-black text-slate-950 dark:text-slate-50">
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
            <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
              {title || "未命名章节"} · 摘要、大纲与细节设定会作为本章写作上下文。
            </p>
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
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 hover:bg-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20 dark:hover:bg-rose-400/15"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]",
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
                className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70 dark:bg-white/[0.035] dark:ring-white/10"
              >
                <div className="mb-1 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {["目标", "冲突", "信息点", "结尾钩子"][index] ?? `节点 ${index + 1}`}
                </div>
                <p className="line-clamp-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {line}
                </p>
              </div>
            ))}
          </div>
        </CollapsiblePanel>

        <MetaTextareaCard
          actionIcon={Sparkles}
          actionLabel={summaryBusy ? `摘要 ${summaryProgressPercent}%` : "生成摘要"}
          actionError={summaryActionError}
          disabled={!work || summaryBusy || saving}
          expanded={expandedSections.summary}
          icon={FileText}
          onAction={() => void handleGenerateSummary()}
          onExpand={() => openMetaEditor("summary")}
          onToggle={() => toggleSection("summary")}
          onValueChange={updateSummary}
          placeholder="生成摘要，或手动整理关键冲突、转折和承接信息..."
          rows={11}
          subtitle="摘要与承接"
          title="章节摘要"
          value={chapterSummary}
        />

        <MetaTextareaCard
          actionIcon={ListChecks}
          actionLabel={outlineBusy ? `大纲 ${outlineProgressPercent}%` : "生成大纲"}
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
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 hover:bg-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20 dark:hover:bg-rose-400/15"
                    : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15",
                )}
              >
                {detailsActionError ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {detailsActionError || (detailsBusy ? `提取 ${detailsProgressPercent}%` : "提取")}
              </button>
              <button
                type="button"
                onClick={() => openMetaEditor("details")}
                disabled={!work || metaSaving}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
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
            className="w-full resize-y rounded-lg bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-600 outline-none ring-1 ring-slate-200/70 transition focus:bg-white focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 dark:ring-white/10 dark:focus:bg-white/[0.06] dark:focus:ring-sky-300/30"
          />
        </CollapsiblePanel>

        </div>

        <div className="shrink-0 border-t border-slate-900/[0.06] bg-white/82 p-2.5 dark:border-white/10 dark:bg-slate-950/35">
          <Link
            href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900/[0.08] bg-white px-3 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回作品看板
          </Link>
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
    <section className="rounded-xl border border-slate-900/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-slate-400 dark:text-slate-500">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform",
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
    <section className="rounded-xl border border-slate-900/[0.06] bg-white/86 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
              {title}
            </span>
            {subtitle ? (
              <span className="mt-1 block truncate text-xs text-slate-400 dark:text-slate-500">
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform",
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
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 hover:bg-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20 dark:hover:bg-rose-400/15"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15",
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
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
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
          className="mt-3 w-full resize-y rounded-lg bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-600 outline-none ring-1 ring-slate-200/70 transition focus:bg-white focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-slate-300 dark:ring-white/10 dark:focus:bg-white/[0.06] dark:focus:ring-sky-300/30"
        />
      ) : null}
    </section>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

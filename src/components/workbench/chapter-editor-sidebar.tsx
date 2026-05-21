"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  FileText,
  ListChecks,
  Maximize2,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { aiZhCN, getAiMetaCopy } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";
import {
  CollapsiblePanel,
  formatChapterLabel,
  MetaTextareaCard,
  type SidebarSectionKey,
} from "./chapter-editor-sidebar-panels";

const rewriteQuickActions = [
  { action: "polish", label: aiZhCN.chapterRewrite.actions.polish.label },
  { action: "expand", label: aiZhCN.chapterRewrite.actions.expand.label },
  { action: "compress", label: aiZhCN.chapterRewrite.actions.compress.label },
  { action: "add_conflict", label: "冲突" },
  { action: "add_emotion", label: "情绪" },
  { action: "short_drama", label: "短剧" },
  { action: "fanqie_style", label: "番茄" },
  { action: "xiaohongshu_style", label: "小红书" },
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
  const isShortStory = isShortStoryWork(work?.workType);
  const currentChapterLabel = isShortStory ? `场景 ${chapterIndex}` : formatChapterLabel(chapterIndex);
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
    <aside className="min-w-0 lg:h-full lg:min-h-0 lg:self-stretch">
      <div className="app-compact-panel flex h-full min-h-0 max-h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 sm:p-3">
          <section className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                  上下文工具
                </p>
                <h2 className="mt-1 truncate text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
                  {currentChapterLabel}
                </h2>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest shadow-sm",
                  currentChapterEdited
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20"
                    : "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20",
                )}
              >
                {currentChapterEdited ? "已写" : "待写"}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--theme-text-secondary)]">
              {title || (isShortStory ? "未命名场景" : "未命名章节")} · 摘要、{isShortStory ? "段落提示" : "大纲"}与细节设定会作为{isShortStory ? "本场景" : "本章"}写作上下文。
            </p>
          </section>

          <section className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--theme-text-strong)]">
                  AI 改写
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-secondary)]">
                  先预览，再应用；应用前自动保存历史版本。
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {rewriteQuickActions.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => openRewriteDialog(item.action)}
                  disabled={!work || rewriteBusy || rewriteApplying}
                  title={rewriteBlockedReason || undefined}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2 text-xs font-semibold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
                    ? "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)] hover:bg-[var(--theme-danger-soft)]"
                    : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
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
            title={isShortStory ? "本场景目标" : "本章目标"}
          >
            <div className="space-y-2">
              {(outlinePreviewLines.length
                ? outlinePreviewLines
                : [isShortStory ? "生成段落提示后，这里会显示本场景目标、冲突、信息点和结尾钩子。" : "生成章节大纲后，这里会显示本章目标、冲突、信息点和结尾钩子。"]
              ).map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className="rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-2.5 ring-1 ring-[var(--theme-border)]"
                >
                  <div className="mb-1 text-[10px] font-bold uppercase text-[var(--theme-text-muted)]">
                    {["目标", "冲突", "信息点", "结尾钩子"][index] ?? `节点 ${index + 1}`}
                  </div>
                  <p className="line-clamp-5 text-sm leading-relaxed text-[var(--theme-text-secondary)]">
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
            title={isShortStory ? "场景摘要" : "章节摘要"}
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
            placeholder={isShortStory ? "生成段落提示，或手动列出本场景关键节点、节奏和钩子..." : "生成大纲，或手动列出本章关键节点、节奏和钩子..."}
            rows={11}
            subtitle={isShortStory ? "场景节点" : "章节节点"}
            title={isShortStory ? "段落提示" : "章节大纲"}
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
                      ? "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)]"
                      : "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] hover:bg-[var(--theme-brand-subtle)]",
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
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--theme-surface-overlay)] px-2 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full resize-y rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-3 text-sm leading-7 text-[var(--theme-text-primary)] outline-none ring-1 ring-[var(--theme-border)] transition focus:bg-[var(--theme-surface-solid)] focus:ring-[var(--theme-brand-border)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </CollapsiblePanel>
        </div>

        <div className="shrink-0 border-t border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-2">
          <Link
            href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-sm font-semibold text-[var(--theme-text-secondary)] shadow-sm transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回作品看板
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  RotateCcw,
  WandSparkles,
  X,
} from "lucide-react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import {
  rewriteActionDescriptions,
  rewriteActionLabels,
  type ChapterRewriteAction,
} from "@/lib/workbench/use-chapter-editor-rewrite";
import { cn } from "@/lib/utils";

const actionOrder: ChapterRewriteAction[] = [
  "polish",
  "expand",
  "compress",
  "add_conflict",
  "add_emotion",
  "short_drama",
  "fanqie_style",
  "xiaohongshu_style",
  "爽文化",
  "细腻化",
  "去 AI 味",
  "增强开头钩子",
  "增强结尾追读感",
  "对话自然化",
  "logic_check",
];

export function ChapterRewriteDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    closeRewriteDialog,
    handleApplyRewrite,
    handleConfirmRewrite,
    resetRewriteResult,
    rewriteAction,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    rewriteDialogOpen,
    rewriteError,
    rewritePreview,
    rewritePrompt,
    rewriteReport,
    rewriteSelection,
    setRewriteAction,
    setRewritePrompt,
  } = editor;

  if (!rewriteDialogOpen) return null;

  const isLogicCheck = rewriteAction === "logic_check";
  const hasResult = isLogicCheck ? Boolean(rewriteReport.trim()) : Boolean(rewritePreview.trim());
  const isBusy = rewriteBusy || rewriteApplying;
  const scopeLabel = rewriteSelection.text.trim()
    ? `当前范围：选中文本 ${rewriteSelection.text.trim().length.toLocaleString("zh-CN")} 字`
    : "当前范围：整章正文";

  const selectAction = (action: ChapterRewriteAction) => {
    if (isBusy) return;
    setRewriteAction(action);
    resetRewriteResult();
  };

  return (
    <div className="fixed inset-0 z-[145] flex items-start justify-center overflow-y-auto px-4 py-6 md:items-center">
      <button
        type="button"
        aria-label="关闭 AI 改写弹窗"
        disabled={isBusy}
        className="rewrite-backdrop absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity disabled:cursor-wait"
        onClick={closeRewriteDialog}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-rewrite-title"
        className="rewrite-panel relative z-10 flex h-[calc(100dvh-3rem)] max-h-[960px] w-full max-w-[1240px] min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-5">
          <div className="flex min-w-0 gap-4">
            <div
              className={cn(
                "rewrite-icon-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-lg shadow-zinc-950/20 ring-1 ring-[var(--theme-brand-border)]",
                (rewriteBusy || rewriteApplying) && "rewrite-icon-processing",
              )}
            >
              <WandSparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
                Chapter Rewrite
              </p>
              <h3
                id="chapter-rewrite-title"
                className="mt-1 truncate text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]"
              >
                {aiZhCN.chapterRewrite.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--theme-text-muted)]">
                {aiZhCN.chapterRewrite.subtitle} {scopeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={isBusy}
            onClick={closeRewriteDialog}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {rewriteError ? (
          <div className="mx-6 mt-5 flex items-start gap-2 rounded-xl bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--theme-danger-text)] ring-1 ring-[var(--theme-danger-border)]/70">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{rewriteError}</span>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-b border-[var(--theme-border)] p-5 md:flex md:min-h-0 md:flex-col md:border-b-0 md:border-r sm:p-6">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
              改写动作
            </div>
            <div className="space-y-3 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-2">
              {actionOrder.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => selectAction(action)}
                  disabled={isBusy}
                  data-active={rewriteAction === action}
                  className={cn(
                    "rewrite-action-card relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                    rewriteAction === action
                      ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-md"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-secondary)] shadow-sm hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-soft)] hover:shadow",
                  )}
                >
                  <span className="block text-sm font-semibold">{rewriteActionLabels[action]}</span>
                  <span
                    className={cn(
                      "mt-1.5 block text-xs font-bold leading-relaxed",
                      rewriteAction === action
                        ? "text-[var(--theme-text-secondary)]"
                        : "text-[var(--theme-text-muted)]",
                    )}
                  >
                    {rewriteActionDescriptions[action]}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col p-5 sm:p-6">
            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
              补充要求
            </label>
            <textarea
              value={rewritePrompt}
              onChange={(event) => setRewritePrompt(event.target.value)}
              disabled={isBusy}
              rows={2}
              placeholder="可选：例如更强压迫感、减少口水话、保留某个桥段..."
              className="mt-3 min-h-[5rem] max-h-[6.5rem] w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-3 text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)] outline-none shadow-sm transition-all placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-border)] disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                disabled={isBusy || Boolean(rewriteBlockedReason)}
                onClick={() => void handleConfirmRewrite()}
                className="rewrite-primary-action theme-brand-gradient-bg inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rewriteBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                {rewriteBusy
                  ? aiZhCN.chapterRewrite.buttons.generating
                  : isLogicCheck
                    ? aiZhCN.chapterRewrite.buttons.check
                    : aiZhCN.chapterRewrite.buttons.preview}
              </button>
              <p className="min-w-0 text-xs font-bold leading-relaxed text-[var(--theme-text-muted)]">
                {rewriteBlockedReason || "预览不会覆盖正文；应用时会先记录历史版本。"}
              </p>
            </div>

            {rewriteBusy ? (
              <div className="rewrite-progress-rail mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-brand-soft)]/80">
                <div className="rewrite-progress-bar h-full rounded-full bg-[var(--theme-brand-500)]" />
              </div>
            ) : null}

            <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-inner">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] px-5 py-4">
                <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-[var(--theme-text-strong)]">
                  <FileText className="h-4 w-4 text-[var(--theme-text-muted)]" />
                  {isLogicCheck
                    ? aiZhCN.chapterRewrite.reportTitle
                    : aiZhCN.chapterRewrite.previewTitle}
                </div>
                {hasResult ? (
                  <span className="rewrite-badge-pop rounded-full bg-[var(--theme-brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
                    {aiZhCN.chapterRewrite.previewReady}
                  </span>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                {rewriteBusy ? (
                  <RewriteLoadingScene />
                ) : hasResult ? (
                  <div className="rewrite-result-content whitespace-pre-wrap break-words pr-2 text-base font-medium leading-relaxed text-[var(--theme-text-strong)]">
                    {isLogicCheck ? rewriteReport : rewritePreview}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[26rem] items-center justify-center text-sm font-bold text-[var(--theme-text-muted)]">
                    {aiZhCN.chapterRewrite.resultEmpty}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={closeRewriteDialog}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-5 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                关闭
              </button>
              {!isLogicCheck ? (
                <button
                  type="button"
                  disabled={isBusy || !rewritePreview.trim()}
                  onClick={() => void handleApplyRewrite()}
                  className="rewrite-apply-action theme-brand-gradient-bg inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg hover:shadow-[var(--theme-brand-500)]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {rewriteApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {rewriteApplying
                    ? aiZhCN.chapterRewrite.buttons.applying
                    : aiZhCN.chapterRewrite.buttons.apply}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleConfirmRewrite()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-5 text-sm font-bold text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  {aiZhCN.chapterRewrite.buttons.recheck}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RewriteLoadingScene() {
  return (
    <div className="rewrite-loading-scene flex h-full min-h-[26rem] flex-col justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-8 py-8 text-sm font-bold text-[var(--theme-text-muted)] shadow-inner">
      <div className="relative z-10 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)]/20">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div className="min-w-0">
          <div className="text-base font-bold text-[var(--theme-text-strong)]">
            {aiZhCN.chapterRewrite.loadingTitle}
          </div>
          <div className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--theme-text-muted)]">
            {aiZhCN.chapterRewrite.loadingDescription}
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-8 space-y-4">
        <div className="rewrite-loading-line h-3 w-11/12 rounded-full bg-[var(--theme-surface-overlay)]/50" />
        <div className="rewrite-loading-line h-3 w-8/12 rounded-full bg-[var(--theme-surface-overlay)]/50" />
        <div className="rewrite-loading-line h-3 w-10/12 rounded-full bg-[var(--theme-surface-overlay)]/50" />
      </div>
    </div>
  );
}

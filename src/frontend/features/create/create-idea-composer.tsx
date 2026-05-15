"use client";

import { ChevronDown, ChevronUp, Sparkles, Wand2, Zap } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { IdeaAnalysisPanel } from "./idea-analysis-panel";

type CreateIdeaComposerProps = {
  create: DashboardCreateController;
  hasIdeaError: boolean;
  helperTitle: string;
  inlineIdeaError: string;
  placeholder: string;
};

export function CreateIdeaComposer({
  create,
  hasIdeaError,
  helperTitle,
  inlineIdeaError,
  placeholder,
}: CreateIdeaComposerProps) {
  const {
    aiBusy,
    aiProgressPercent,
    aiProgressValue,
    aiThinkingCopy,
    aiThinkingCopyIndex,
    analysisBusy,
    analysisPanelVisible,
    analyzeBlockedByAiThinking,
    canAnalyzeIdea,
    canGenerateAi,
    handleAnalyzeIdea,
    handleGenerateAi,
    idea,
    ideaAnalysis,
    isCustomGenre,
    setAnalysisOpen,
    setIdeaAnalysis,
    showAiProgress,
    submitBlockedReason,
    updateIdea,
    wordCount,
    MIN_IDEA_LENGTH_FOR_OUTLINE,
  } = create;

  return (
    <div id="create-idea-section" className="px-5 py-4">
      {/* ── 区域标题 ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--theme-text-strong)]">
          故事创意
        </h2>
        <span className="rounded-full bg-[var(--theme-surface-overlay)] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-text-secondary)]">
          {helperTitle}
        </span>
      </div>

      {/* ── AI 进度条 ── */}
      {showAiProgress && (
        <div
          role="progressbar"
          aria-label="AI 正在分析创意"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiProgressPercent}
          className="mb-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse text-emerald-500" />
              <span
                key={aiThinkingCopyIndex}
                className="text-sm font-medium text-[var(--theme-text-strong)] animate-[ai-copy-swap_220ms_ease-out]"
              >
                {aiThinkingCopy || "正在分析创意"}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
              {aiProgressPercent}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--theme-surface-solid)]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-linear"
              style={{ width: `${aiProgressValue}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 错误提示 ── */}
      {inlineIdeaError && (
        <p className="mb-3 text-xs font-medium text-red-500">
          {inlineIdeaError}
        </p>
      )}

      {/* ── 操作按钮行 ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isCustomGenre && (
          <button
            type="button"
            disabled={aiBusy || !canGenerateAi}
            onClick={handleGenerateAi}
            title={
              canGenerateAi
                ? "根据当前设定生成完整简介"
                : "请先补充题材、标签和故事创意"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--theme-text-strong)] px-4 text-sm font-semibold text-[var(--theme-bg)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {aiBusy ? (
              <Sparkles className="h-4 w-4 animate-pulse" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {aiBusy
              ? "生成中..."
              : !canGenerateAi
                ? "先补充设定"
                : "AI 生成创意"}
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleAnalyzeIdea(idea)}
          disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3.5 text-sm font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wand2
            className={cn(
              "h-4 w-4",
              (analyzeBlockedByAiThinking || analysisBusy) && "animate-pulse",
            )}
          />
          {analyzeBlockedByAiThinking
            ? "等待中"
            : analysisBusy
              ? "分析中"
              : ideaAnalysis
                ? "重新分析"
                : "分析创意"}
        </button>
      </div>

      {/* ── 文本输入区 ── */}
      <div className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] transition-colors focus-within:border-[var(--theme-text-strong)] focus-within:ring-2 focus-within:ring-[var(--theme-text-strong)]/10">
        <textarea
          id="create-idea-input"
          value={idea}
          onChange={(event) => {
            updateIdea(event.target.value);
            setIdeaAnalysis(null);
          }}
          rows={7}
          aria-invalid={hasIdeaError}
          aria-describedby={hasIdeaError ? "create-form-error" : undefined}
          className={cn(
            "min-h-[180px] w-full resize-y border-0 bg-transparent px-4 py-3 text-sm leading-7 text-[var(--theme-text-strong)] outline-none placeholder:text-[var(--theme-text-muted)]",
            hasIdeaError && "bg-red-50/20 dark:bg-red-500/5",
          )}
          placeholder={placeholder}
        />
        <div className="flex items-center justify-between border-t border-[var(--theme-divider)] px-4 py-2">
          <p className="text-[11px] text-[var(--theme-text-muted)]">
            {submitBlockedReason ||
              `建议至少 ${MIN_IDEA_LENGTH_FOR_OUTLINE} 字`}
          </p>
          <span
            className={cn(
              "text-[11px] font-semibold",
              wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--theme-text-muted)]",
            )}
          >
            {wordCount} / 2000
          </span>
        </div>
      </div>

      {/* ── 创意分析面板 ── */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setAnalysisOpen(!analysisPanelVisible)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--theme-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--theme-surface-hover)]"
        >
          <div>
            <span className="text-sm font-semibold text-[var(--theme-text-strong)]">
              创意分析
            </span>
            <span className="ml-2 text-xs text-[var(--theme-text-muted)]">
              {ideaAnalysis
                ? "已生成分析结果"
                : "可选，补充创意后再分析"}
            </span>
          </div>
          {analysisPanelVisible ? (
            <ChevronUp className="h-4 w-4 text-[var(--theme-text-muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--theme-text-muted)]" />
          )}
        </button>

        {analysisPanelVisible && (analysisBusy || ideaAnalysis) && (
          <div className="mt-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-4">
            {analysisBusy ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
                正在分析创意亮点、卖点与目标读者...
              </div>
            ) : ideaAnalysis ? (
              <IdeaAnalysisPanel analysis={ideaAnalysis} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

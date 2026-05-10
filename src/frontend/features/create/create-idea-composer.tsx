"use client";

import { Gauge, RefreshCcw, Sparkles, Wand2, Zap } from "lucide-react";

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
    aiProgressLabelLeft,
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
    <div id="create-idea-section">
      <div className="border-b border-[var(--theme-border)] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-semibold text-[var(--theme-text-strong)]">
            专业编辑输入区
          </h2>

          <MetaChip label="工作模式" value={helperTitle} />
        </div>
      </div>

      {showAiProgress ? (
        <div
          role="progressbar"
          aria-label="AI 正在分析创意"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiProgressPercent}
          className="border-b border-[var(--theme-border)] px-4 py-3"
        >
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--theme-text-strong)]">
                  正在分析创意
                </p>
                <p className="mt-1 text-xs text-[var(--theme-text-secondary)]">
                  系统正在补全结构、判断题材并准备生成大纲。
                </p>
              </div>
              <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-text-strong)]">
                {aiProgressPercent}%
              </span>
            </div>

            <div className="relative">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-surface-solid)]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-linear"
                  style={{ width: `${aiProgressValue}%` }}
                />
              </div>
              <div
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-[left] duration-300 ease-linear"
                style={{ left: `${aiProgressLabelLeft}%` }}
              >
                {aiProgressPercent}%
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span key={aiThinkingCopyIndex} className="animate-[ai-copy-swap_220ms_ease-out]">
                {aiThinkingCopy}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="px-4 py-3"
        onMouseEnter={() => setAnalysisOpen(true)}
        onMouseLeave={() => setAnalysisOpen(false)}
        onFocusCapture={() => setAnalysisOpen(true)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (nextTarget && event.currentTarget.contains(nextTarget)) return;
          setAnalysisOpen(false);
        }}
      >
        {inlineIdeaError ? (
          <p className="mb-3 text-sm font-medium text-red-600 dark:text-red-400">
            {inlineIdeaError}
          </p>
        ) : null}

        <div className="mb-2.5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--theme-text-strong)]">
              输入你的故事创意
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isCustomGenre ? (
              <button
                type="button"
                disabled={aiBusy || !canGenerateAi}
                onClick={handleGenerateAi}
                title={canGenerateAi ? "根据当前设定生成完整简介" : "请先补充题材、标签和故事创意"}
                aria-label={canGenerateAi ? "AI 生成创意" : "请先补充题材、标签和故事创意"}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {aiBusy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Zap className="h-4 w-4" />}
                {aiBusy ? (
                  <span key={aiThinkingCopyIndex} className="animate-[ai-copy-swap_220ms_ease-out]">
                    {aiThinkingCopy}
                  </span>
                ) : !canGenerateAi ? (
                  "先补充设定"
                ) : (
                  "生成创意"
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void handleAnalyzeIdea(idea)}
              disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3.5 text-sm font-semibold text-[var(--theme-text-secondary)] shadow-sm transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wand2 className={cn("h-4 w-4", (analyzeBlockedByAiThinking || analysisBusy) && "animate-pulse")} />
              {analyzeBlockedByAiThinking
                ? "等待当前任务完成"
                : analysisBusy
                  ? "正在分析"
                  : ideaAnalysis
                    ? "重新分析"
                    : "分析创意"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
          <div className="flex items-center justify-between border-b border-[var(--theme-divider)] px-4 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-text-secondary)]">
              <Gauge className="h-3.5 w-3.5" />
              编辑区
            </div>
            <div className="text-xs text-[var(--theme-text-muted)]">
              建议至少 {MIN_IDEA_LENGTH_FOR_OUTLINE} 字
            </div>
          </div>

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
              "min-h-[190px] w-full resize-y border-0 bg-transparent px-4 py-3 text-[15px] leading-7 text-[var(--theme-text-strong)] outline-none transition-colors placeholder:text-[var(--theme-text-muted)] focus:bg-[var(--theme-surface-solid)]",
              hasIdeaError && "bg-red-50/30 dark:bg-red-500/5",
            )}
            placeholder={placeholder}
          />

          <div className="flex flex-col gap-2 border-t border-[var(--theme-divider)] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--theme-text-secondary)]">
              {submitBlockedReason || "信息已完整，可以直接生成大纲。"}
            </p>
            <div className="text-xs font-semibold text-[var(--theme-text-muted)]">
              <span
                className={cn(
                  wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE && "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {wordCount}
              </span>
              <span> / 2000</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-2.5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--theme-text-strong)]">
                创意分析面板
              </h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-secondary)]">
                {ideaAnalysis ? "已生成分析结果" : "可选功能，补充创意后再分析。"}
              </p>
            </div>

            {isCustomGenre ? (
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={aiBusy || analysisBusy || !canGenerateAi}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-semibold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", aiBusy && "animate-spin")} />
                重新生成创意
              </button>
            ) : null}
          </div>

          {analysisPanelVisible && (analysisBusy || ideaAnalysis) ? (
          <div className="mt-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)]">
            <div className="border-b border-[var(--theme-divider)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-text-secondary)]">
                  AI 辅助分析
                </span>
                <span className="text-xs text-[var(--theme-text-muted)]">
                  {analysisPanelVisible ? "面板已展开" : "聚焦编辑区或点击分析后查看"}
                </span>
              </div>
            </div>

            <div className="p-4">
              {analysisBusy ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  正在分析创意亮点、卖点与目标读者。
                </div>
              ) : ideaAnalysis ? (
                <IdeaAnalysisPanel analysis={ideaAnalysis} />
              ) : null}
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaChip({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "success";
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
      )}
    >
      <span className="text-[var(--theme-text-muted)]">{label}</span>
      <span className="ml-1.5 font-semibold text-current">{value}</span>
    </div>
  );
}

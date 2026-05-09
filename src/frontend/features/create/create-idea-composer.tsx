"use client";

import { RefreshCcw, Sparkles, Star, Zap } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";
import { IdeaAnalysisPanel } from "./idea-analysis-panel";

type CreateIdeaComposerProps = {
  create: DashboardCreateController;
  hasIdeaError: boolean;
  helperTitle: string;
  inlineIdeaError: string;
  placeholder: string;
  readinessText: string;
};

export function CreateIdeaComposer({
  create,
  hasIdeaError,
  helperTitle,
  inlineIdeaError,
  placeholder,
  readinessText,
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
    canSubmitOutline,
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
      <div className="flex flex-col gap-2 border-b border-[var(--theme-border)]/40 bg-gradient-to-r from-emerald-500/5 to-transparent px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-500/25">
            2
          </span>
          故事简介
        </label>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]/60">
            {helperTitle}
          </span>
          <span
            className={cn(
              "inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ring-1",
              canSubmitOutline
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                : "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
            )}
          >
            {readinessText}
          </span>
        </div>
      </div>

      {showAiProgress ? (
        <div
          role="progressbar"
          aria-label="AI 生成进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiProgressPercent}
          className="px-5 pt-4"
        >
          <div className="relative">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-surface-overlay)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-300 ease-linear animate-[ai-progress-shimmer_1.2s_linear_infinite] motion-reduce:animate-none"
                style={{
                  width: `${aiProgressValue}%`,
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--theme-border)]/60 bg-[var(--theme-surface-solid)] px-2.5 py-1 text-[11px] font-bold text-[var(--theme-text-strong)] shadow-sm transition-[left] duration-300 ease-linear"
              style={{ left: `${aiProgressLabelLeft}%` }}
            >
              {aiProgressPercent}%
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="px-5 py-4"
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
          <p className="mb-3 text-xs font-bold tracking-wide text-[var(--theme-danger-text)]">
            {inlineIdeaError}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
            {isCustomGenre
              ? "填好题材、标签和一句话创意后，点 AI 生成；也可以直接自己写。"
              : "模板已经落到简介里，继续改成你的主角、冲突和爽点。"}
          </p>

          <button
            type="button"
            disabled={aiBusy || !canGenerateAi}
            onClick={handleGenerateAi}
            title={canGenerateAi ? "让 AI 根据题材、标签和一句话创意生成完整简介" : "请先填写题材、标签和一句话创意"}
            aria-label={canGenerateAi ? "AI 生成创意" : "请先填写题材、标签和一句话创意"}
            className="group relative inline-flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 dark:from-emerald-400 dark:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {aiBusy ? (
              <>
                <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-white/20" />
                <span className="pointer-events-none absolute left-0 top-0 h-[45%] w-1.5 bg-white/40 animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
              </>
            ) : null}

            <span className="relative z-10 inline-flex items-center gap-2">
              {aiBusy ? (
                <Sparkles className="h-4 w-4 animate-pulse" />
              ) : (
                <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
              )}
              {aiBusy ? (
                <span
                  key={aiThinkingCopyIndex}
                  className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none"
                >
                  {aiThinkingCopy}
                </span>
              ) : !canGenerateAi ? (
                "先补创意"
              ) : (
                "AI 生成创意"
              )}
            </span>
          </button>
        </div>

        <div className="relative">
          <textarea
            id="create-idea-input"
            value={idea}
            onChange={(event) => {
              updateIdea(event.target.value);
              setIdeaAnalysis(null);
            }}
            rows={6}
            aria-invalid={hasIdeaError}
            aria-describedby={hasIdeaError ? "create-form-error" : undefined}
            className={cn(
              "min-h-[180px] w-full resize-y rounded-xl bg-[var(--theme-surface-overlay)] p-4 pr-16 text-[15px] font-medium leading-relaxed text-[var(--theme-text-strong)] ring-1 ring-[var(--theme-border)]/60 outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:ring-2 focus:ring-emerald-500/40 focus:shadow-sm",
              hasIdeaError && "ring-2 ring-red-400 focus:ring-red-400",
            )}
            placeholder={placeholder}
          />

          <div className="pointer-events-none absolute bottom-4 right-5 flex items-center gap-2 text-xs font-bold text-[var(--theme-text-muted)]">
            <span
              className={cn(
                wordCount > 2000
                  ? "text-[var(--theme-danger-text)]"
                  : wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE
                    ? "text-[var(--theme-brand-text)]"
                    : "text-[var(--theme-text-primary)]",
              )}
            >
              {wordCount}
            </span>
            / 2000
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-[var(--theme-border)]/60 bg-[var(--theme-surface-overlay)] px-4 py-3 text-xs font-medium text-[var(--theme-text-secondary)]">
          {submitBlockedReason || "当前信息已经足够，可以直接创建大纲。"}
        </div>

        {analysisPanelVisible ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-[var(--theme-surface-solid)] shadow-sm dark:border-emerald-500/15 dark:from-emerald-500/5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100/80 px-5 py-4 dark:border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--theme-text-strong)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                    <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  AI 看法
                </div>

                <button
                  type="button"
                  onClick={() => void handleAnalyzeIdea(idea)}
                  disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--theme-surface-solid)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border)]/60 transition-all hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles
                    className={cn(
                      "h-3 w-3",
                      analyzeBlockedByAiThinking || analysisBusy ? "animate-pulse" : "",
                      analyzeBlockedByAiThinking
                        ? "text-[var(--theme-text-muted)]"
                        : "text-emerald-500",
                    )}
                  />
                  {analyzeBlockedByAiThinking
                    ? "请等 AI 写完"
                    : analysisBusy
                      ? "分析中"
                      : ideaAnalysis
                        ? "重新分析"
                        : "分析简介"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={aiBusy || analysisBusy || !canGenerateAi}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--theme-text-strong)] px-4 py-2 text-xs font-bold text-[var(--theme-bg)] transition-all hover:bg-[var(--theme-text-primary)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", aiBusy && "animate-spin")} />
                换一版
              </button>
            </div>

            <div className="p-5">
              {analysisBusy ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  正在拆解简介亮点
                </div>
              ) : ideaAnalysis ? (
                <IdeaAnalysisPanel analysis={ideaAnalysis} />
              ) : (
                <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
                  鼠标停在简介区域，或点击分析，就能看到 AI 对这个创意的判断。
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

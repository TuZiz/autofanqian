"use client";

import { AlertCircle, ChevronDown, ChevronUp, Sparkles, Wand2, Zap } from "lucide-react";

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
    <section
      id="create-idea-section"
      className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            02
          </div>
          <h2 className="mt-1 text-sm font-extrabold tracking-tight text-slate-950">
            故事创意
          </h2>
        </div>
        <span className="max-w-[45%] truncate rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          {helperTitle}
        </span>
      </div>

      {showAiProgress && (
        <div
          role="progressbar"
          aria-label="AI 正在分析创意"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiProgressPercent}
          className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </span>
              <span
                key={aiThinkingCopyIndex}
                className="truncate text-sm font-semibold text-slate-900 animate-[ai-copy-swap_220ms_ease-out]"
              >
                {aiThinkingCopy || "正在分析创意"}
              </span>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-700">
              {aiProgressPercent}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/90">
            <div
              className="h-full rounded-full bg-slate-950 transition-[width] duration-300 ease-linear"
              style={{ width: `${aiProgressValue}%` }}
            />
          </div>
        </div>
      )}

      {inlineIdeaError && (
        <p className="mb-2.5 flex items-start gap-1.5 text-[12px] leading-5 text-red-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {inlineIdeaError}
        </p>
      )}

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
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {aiBusy ? (
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
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
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <Wand2
            className={cn(
              "h-3.5 w-3.5",
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

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 transition-all focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-950/10",
          hasIdeaError && "border-red-300 focus-within:border-red-300 focus-within:ring-red-500/15",
        )}
      >
        <textarea
          id="create-idea-input"
          value={idea}
          onChange={(event) => {
            updateIdea(event.target.value);
            setIdeaAnalysis(null);
          }}
          rows={5}
          aria-invalid={hasIdeaError}
          aria-describedby={hasIdeaError ? "create-form-error" : undefined}
          className="min-h-[150px] w-full resize-y bg-transparent px-3.5 py-3 text-[14px] font-medium leading-6 text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 bg-white/70 px-3.5 py-2">
          <p className="min-w-0 truncate text-xs font-medium text-slate-500">
            {submitBlockedReason ||
              `建议至少 ${MIN_IDEA_LENGTH_FOR_OUTLINE} 字后生成大纲`}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
              wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {wordCount} / 2000
          </span>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setAnalysisOpen(!analysisPanelVisible)}
          className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
        >
          <Wand2 className="h-3.5 w-3.5 text-slate-500" />
          创意分析
          {ideaAnalysis ? (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
          ) : null}
          {analysisPanelVisible ? (
            <ChevronUp className="ml-1 h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {analysisPanelVisible && (analysisBusy || ideaAnalysis) && (
          <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            {analysisBusy ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 animate-pulse" />
                正在分析创意亮点、卖点与目标读者...
              </div>
            ) : ideaAnalysis ? (
              <IdeaAnalysisPanel analysis={ideaAnalysis} />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { RefreshCcw, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type CreateIdeaSectionProps = {
  create: DashboardCreateController;
};

export function CreateIdeaSection({ create }: CreateIdeaSectionProps) {
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
    setAnalysisOpen,
    setIdeaAnalysis,
    updateIdea,
    showAiProgress,
    wordCount,
  } = create;
  const hasIdeaError = create.formErrorTarget === "idea" || create.formErrorTarget === "ai";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="text-blue-500">*</span>
            详细描述你的创意
          </label>
          <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            写下至少 10 个字的核心创意，然后让 AI 帮你扩写和润色。
          </p>
        </div>
        
        <button
          type="button"
          disabled={aiBusy || !canGenerateAi}
          onClick={handleGenerateAi}
          title={canGenerateAi ? "让 AI 根据当前创意继续优化" : "请先填写至少 10 个字的创意描述"}
          aria-label={canGenerateAi ? aiZhCN.idea.optimize : "请先填写创意描述"}
          className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-600 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
        >
          {aiBusy ? (
            <>
              <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-blue-500/20" />
              <span className="pointer-events-none absolute left-0 top-0 h-[45%] w-1.5 bg-blue-500 animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
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
              aiZhCN.idea.needInput
            ) : (
              aiZhCN.idea.optimize
            )}
          </span>
        </button>
      </div>

      {showAiProgress ? (
        <div
          role="progressbar"
          aria-label="AI 生成进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiProgressPercent}
        >
          <div className="relative">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-300 ease-linear animate-[ai-progress-shimmer_1.2s_linear_infinite] motion-reduce:animate-none"
                style={{
                  width: `${aiProgressValue}%`,
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/5 bg-white px-2.5 py-0.5 text-[11px] font-black text-zinc-900 shadow-sm transition-[left] duration-300 ease-linear dark:border-white/10 dark:bg-zinc-800 dark:text-white"
              style={{ left: `${aiProgressLabelLeft}%` }}
            >
              {aiProgressPercent}%
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="relative"
        onMouseEnter={() => setAnalysisOpen(true)}
        onMouseLeave={() => setAnalysisOpen(false)}
        onFocusCapture={() => setAnalysisOpen(true)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (nextTarget && event.currentTarget.contains(nextTarget)) return;
          setAnalysisOpen(false);
        }}
      >
        <textarea
          id="create-idea-input"
          value={idea}
          onChange={(event) => {
            updateIdea(event.target.value);
            setIdeaAnalysis(null);
          }}
          rows={8}
          aria-invalid={hasIdeaError}
          aria-describedby={hasIdeaError ? "create-form-error" : undefined}
          className={cn(
            "w-full resize-y rounded-[24px] bg-white p-6 text-[15px] font-medium leading-relaxed text-zinc-900 shadow-inner ring-1 ring-zinc-200 outline-none transition-all placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 dark:bg-black/40 dark:text-zinc-100 dark:ring-white/10 dark:placeholder:text-zinc-600",
            hasIdeaError && "ring-2 ring-red-500"
          )}
          placeholder={
            "描述你的小说创意，例如：\n· 主角的身份背景和特殊能力\n· 故事的主要冲突和爽点\n· 想要的写作风格和氛围\n\n或者点击右侧的模板快速填充..."
          }
        />
        
        <div className="absolute bottom-5 right-6 flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
          <span className={wordCount > 2000 ? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}>{wordCount}</span>
          / 2000
        </div>

        {/* 创意解析面板 */}
        {analysisPanelVisible ? (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-blue-100 bg-blue-50/50 shadow-inner dark:border-blue-500/20 dark:bg-blue-900/10">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-100/50 px-6 py-4 dark:border-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-white">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Star className="h-3 w-3" />
                  </div>
                  {aiZhCN.idea.analyzeTitle}
                </div>
                
                <button
                  type="button"
                  onClick={() => void handleAnalyzeIdea(idea)}
                  disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-zinc-700"
                >
                  <Sparkles
                    className={cn(
                      "h-3 w-3",
                      analyzeBlockedByAiThinking || analysisBusy ? "animate-pulse" : "",
                      analyzeBlockedByAiThinking ? "text-zinc-400" : "text-blue-500"
                    )}
                  />
                  {analyzeBlockedByAiThinking
                    ? aiZhCN.idea.analyzeWait
                    : analysisBusy
                      ? aiZhCN.idea.analyzeBusy
                      : ideaAnalysis
                        ? aiZhCN.idea.analyzeRetry
                        : aiZhCN.idea.analyzeStart}
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={aiBusy || analysisBusy || !canGenerateAi}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", aiBusy && "animate-spin")} />
                {aiZhCN.idea.swap}
              </button>
            </div>

            <div className="p-6">
              {analysisBusy ? (
                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {aiZhCN.idea.analyzePanelBusy}
                </div>
              ) : ideaAnalysis ? (
                <IdeaAnalysisPanel analysis={ideaAnalysis} />
              ) : (
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {aiZhCN.idea.analyzePanelEmpty}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type IdeaAnalysisPanelProps = {
  analysis: NonNullable<DashboardCreateController["ideaAnalysis"]>;
};

function IdeaAnalysisPanel({ analysis }: IdeaAnalysisPanelProps) {
  return (
    <div className="space-y-6">
      <p className="text-base font-bold leading-relaxed text-zinc-800 dark:text-zinc-200">
        {analysis.oneLinePitch}
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-400">推荐书名</div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedTitles.map((title) => (
                <span
                  key={title}
                  className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          {analysis.keyPhrases.length > 0 && (
            <div>
              <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-400">关键词</div>
              <div className="flex flex-wrap gap-2">
                {analysis.keyPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:bg-white/5 dark:text-zinc-300"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-400">核心卖点</div>
          <div className="space-y-2">
            {analysis.coreSellingPoints.map((point) => (
              <div
                key={point}
                className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-50 px-5 py-4 text-sm font-medium text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
        <span className="mr-3 font-black text-zinc-900 dark:text-white">目标读者</span>
        {analysis.targetReaders}
      </div>
    </div>
  );
}

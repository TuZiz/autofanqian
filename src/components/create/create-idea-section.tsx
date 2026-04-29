"use client";

import { RefreshCcw, Sparkles, Star, Zap } from "lucide-react";

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

  return (
    <div>
      <div className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="theme-heading block text-sm font-semibold">
            <span className="mr-1 text-rose-500">*</span>
            详细描述你的创意
          </label>
          <button
            type="button"
            disabled={aiBusy || !canGenerateAi}
            onClick={handleGenerateAi}
            title={canGenerateAi ? "让 AI 根据当前创意继续优化" : "请先填写至少 10 个字的创意描述"}
            aria-label={canGenerateAi ? "AI 优化创意" : "请先填写创意描述"}
            className="theme-button-secondary relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiBusy ? (
              <>
                <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-slate-900/5 dark:bg-white/10" />
                <span className="pointer-events-none absolute left-0 top-0 h-[45%] w-1.5 rounded-r-full bg-emerald-500 animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
              </>
            ) : null}

            <span className="relative z-10 inline-flex items-center gap-2">
              {aiBusy ? (
                <Sparkles className="h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-300" />
              ) : (
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              )}
              {aiBusy ? (
                <span
                  key={aiThinkingCopyIndex}
                  className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none"
                >
                  {aiThinkingCopy}
                </span>
              ) : !canGenerateAi ? (
                "先写创意"
              ) : (
                "AI 优化创意"
              )}
            </span>
          </button>
        </div>

        {!canGenerateAi ? (
          <p className="theme-muted mt-2 text-xs leading-relaxed">
            先写下至少 10 个字的核心创意，再让 AI 帮你扩写和润色。
          </p>
        ) : null}

        {showAiProgress ? (
          <div
            className="mt-3"
            role="progressbar"
            aria-label="AI 生成进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={aiProgressPercent}
          >
            <div className="relative">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-linear motion-reduce:animate-none animate-[ai-progress-shimmer_1.2s_linear_infinite]"
                  style={{
                    width: `${aiProgressValue}%`,
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>

              <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-black/10 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur transition-[left] duration-300 ease-linear motion-reduce:transition-none dark:border-white/10 dark:bg-zinc-900/90 dark:text-white"
                style={{ left: `${aiProgressLabelLeft}%` }}
              >
                {aiProgressPercent}%
              </div>
            </div>
          </div>
        ) : null}
      </div>

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
          value={idea}
          onChange={(event) => {
            updateIdea(event.target.value);
            setIdeaAnalysis(null);
          }}
          rows={6}
          required
            className="theme-textarea w-full resize-y rounded-lg px-5 py-4"
          placeholder={
            "描述你的小说创意，例如：\n• 主角的身份背景和特殊能力\n• 故事的主要冲突和爽点\n• 想要的写作风格和氛围\n\n或者点击右侧的模板快速填充..."
          }
        />
        <div className="theme-weak absolute bottom-3 right-4 text-xs">
          <span className={wordCount > 2000 ? "text-rose-500" : ""}>{wordCount}</span>{" "}
          / 2000
        </div>

        {analysisPanelVisible ? (
          <div className="theme-card-soft mt-4 rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="theme-heading flex items-center gap-2 text-sm font-semibold">
                  <Star className="h-4 w-4 text-emerald-600/90 dark:text-emerald-300/90" />
                  AI 创意分析
                </div>
                <button
                  type="button"
                  onClick={() => void handleAnalyzeIdea(idea)}
                  disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
                className="theme-button-secondary inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={
                    analyzeBlockedByAiThinking
                      ? "请等待 AI 生成结束后再分析"
                      : "开始 AI 创意分析"
                  }
                >
                  <Sparkles
                    className={
                      analyzeBlockedByAiThinking
                        ? "h-4 w-4 animate-pulse text-slate-500 dark:text-white/60"
                        : analysisBusy
                          ? "h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-300"
                          : "h-4 w-4 text-emerald-600 dark:text-emerald-300"
                    }
                  />
                  {analyzeBlockedByAiThinking
                    ? "请等待..."
                    : analysisBusy
                      ? "分析中..."
                      : ideaAnalysis
                        ? "重新分析"
                        : "开始分析"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={aiBusy || analysisBusy || !canGenerateAi}
              className="theme-button-secondary inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={["h-4 w-4", aiBusy ? "animate-spin" : ""].join(" ")} />
                换一个
              </button>
            </div>

            {analysisBusy ? (
              <div className="theme-subheading mt-4 flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-300" />
                正在分析创意...
              </div>
            ) : ideaAnalysis ? (
              <IdeaAnalysisPanel analysis={ideaAnalysis} />
            ) : (
              <p className="theme-subheading mt-4 text-sm leading-relaxed">
                点击上方“开始分析”生成创意分析（至少 10 个字）。想换一条创意可点右侧“换一个”。
              </p>
            )}
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
    <div className="mt-4 space-y-5">
      <p className="theme-subheading text-sm leading-relaxed">{analysis.oneLinePitch}</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="theme-muted text-xs font-medium">推荐书名</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.recommendedTitles.map((title) => (
                <span
                  key={title}
                  className="theme-chip-brand inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          {analysis.keyPhrases.length ? (
            <div>
              <div className="theme-muted text-xs font-medium">关键词</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysis.keyPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="theme-chip inline-flex items-center rounded-md px-3 py-1 text-xs font-medium"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="theme-muted text-xs font-medium">核心卖点</div>
          <div className="mt-2 space-y-2">
            {analysis.coreSellingPoints.map((point) => (
              <div
                key={point}
                className="theme-chip-success rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="theme-inline-note rounded-lg px-4 py-3 text-sm">
        <span className="theme-muted mr-2 text-xs font-medium">目标读者:</span>
        {analysis.targetReaders}
      </div>
    </div>
  );
}

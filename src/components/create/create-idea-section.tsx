"use client";

import { RefreshCcw, Sparkles, Star, Zap } from "lucide-react";

import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

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
    canSubmitOutline,
    effectiveGenreLabel,
    formError,
    formErrorTarget,
    handleAnalyzeIdea,
    handleGenerateAi,
    idea,
    ideaAnalysis,
    isCustomGenre,
    outlineIdeaRemaining,
    selectedGenre,
    setAnalysisOpen,
    setIdeaAnalysis,
    showAiProgress,
    submitBlockedReason,
    updateIdea,
    wordCount,
    MIN_IDEA_LENGTH_FOR_OUTLINE,
  } = create;

  const hasIdeaError = formErrorTarget === "idea" || formErrorTarget === "ai";
  const inlineIdeaError = formErrorTarget === "idea" ? formError : "";
  const readyForOutline = canSubmitOutline;
  const readinessText =
    wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE
      ? "已达到创建门槛"
      : `还差 ${outlineIdeaRemaining} 字可创建大纲`;
  const helperTitle = !selectedGenre
    ? "先选创作方式"
    : isCustomGenre
      ? "自定义简介"
      : `模板落地 · ${effectiveGenreLabel ?? "当前题材"}`;
  const placeholder = isCustomGenre
    ? "写清主角是谁、这个世界最特殊的规则是什么、规则会带来什么冲突，以及这本书最抓人的爽点。"
    : "把模板落到你的故事里：主角是谁、现在卡在什么局面、这个题材的升级线或爽点是什么、你准备怎么做差异化？";

  return (
    <section id="create-idea-section" className="overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[var(--theme-border)] bg-gradient-to-r from-[var(--theme-brand-500)]/5 to-transparent px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <label className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            <span className="flex h-7 w-7 items-center justify-center bg-[var(--theme-brand-500)] text-xs font-black text-white shadow-sm">
              2
            </span>
            故事简介
          </label>
          <p className="mt-1 text-xs font-medium text-[var(--theme-text-secondary)]">
            这是你真正要写的内容。先写 50 字以上，再创建大纲。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex bg-[var(--theme-surface-overlay)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
            {helperTitle}
          </span>
          <span className={cn(
            "inline-flex px-3 py-1.5 text-xs font-bold ring-1",
            readyForOutline
              ? "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-[var(--theme-brand-border)]"
              : "bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)] ring-[var(--theme-warning-border)]"
          )}>
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
          className="px-4 pt-3"
        >
          <div className="relative">
            <div className="h-1.5 overflow-hidden bg-[var(--theme-surface-overlay)]">
              <div
                className="h-full bg-[var(--theme-brand-500)] transition-[width] duration-300 ease-linear animate-[ai-progress-shimmer_1.2s_linear_infinite] motion-reduce:animate-none"
                style={{
                  width: `${aiProgressValue}%`,
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--theme-text-strong)] shadow-sm transition-[left] duration-300 ease-linear"
              style={{ left: `${aiProgressLabelLeft}%` }}
            >
              {aiProgressPercent}%
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
          <p className="mb-3 text-xs font-bold tracking-wide text-[var(--theme-danger-text)]">
            {inlineIdeaError}
          </p>
        ) : null}

        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
            {isCustomGenre
              ? "把你的世界规则、主角处境和冲突钩子写出来。"
              : "把模板真正落到你的故事里，不要只写通用套路。"}
          </p>

          <button
            type="button"
            disabled={aiBusy || !canGenerateAi}
            onClick={handleGenerateAi}
            title={
              canGenerateAi
                ? "让 AI 根据当前草稿生成更完整的简介"
                : "请先填写至少 10 个字的创意描述"
            }
            aria-label={canGenerateAi ? aiZhCN.idea.optimize : "请先填写创意描述"}
            className="group relative inline-flex shrink-0 cursor-pointer items-center gap-2 overflow-hidden bg-[var(--theme-brand-soft)] px-3.5 py-2 text-sm font-bold text-[var(--theme-brand-text)] transition-all hover:bg-[var(--theme-brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiBusy ? (
              <>
                <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-[var(--theme-brand-soft)]" />
                <span className="pointer-events-none absolute left-0 top-0 h-[45%] w-1.5 bg-[var(--theme-brand-500)] animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
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
              "min-h-[170px] w-full resize-y bg-[var(--theme-surface-overlay)] p-4 pr-16 text-[15px] font-medium leading-relaxed text-[var(--theme-text-strong)] ring-1 ring-[var(--theme-border)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:ring-2 focus:ring-[var(--theme-brand-500)]/40",
              hasIdeaError && "ring-2 ring-[var(--theme-danger-border)] focus:ring-[var(--theme-danger-border)]",
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

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-3 py-2.5 text-xs font-medium text-[var(--theme-text-secondary)]">
            {submitBlockedReason || "当前信息已经足够，可以直接创建大纲。"}
          </div>

          <div className="border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
              AI 优先关注
            </div>
            <div className="mt-2 text-sm font-bold text-[var(--theme-text-primary)]">
              {isCustomGenre ? "规则 / 冲突 / 爽点" : "主角 / 钩子 / 差异化"}
            </div>
          </div>
        </div>

        {analysisPanelVisible ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--theme-brand-border)] bg-gradient-to-b from-[var(--theme-brand-soft)]/50 to-[var(--theme-surface-solid)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--theme-brand-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--theme-text-strong)]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--theme-brand-soft)]">
                    <Star className="h-3.5 w-3.5 text-[var(--theme-brand-text)]" />
                  </div>
                  {aiZhCN.idea.analyzeTitle}
                </div>

                <button
                  type="button"
                  onClick={() => void handleAnalyzeIdea(idea)}
                  disabled={analyzeBlockedByAiThinking || analysisBusy || !canAnalyzeIdea}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--theme-surface-solid)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-[var(--theme-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles
                    className={cn(
                      "h-3 w-3",
                      analyzeBlockedByAiThinking || analysisBusy ? "animate-pulse" : "",
                      analyzeBlockedByAiThinking ? "text-[var(--theme-text-muted)]" : "text-[var(--theme-brand-text)]",
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--theme-text-strong)] px-4 py-2 text-xs font-bold text-[var(--theme-bg)] transition-all hover:bg-[var(--theme-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", aiBusy && "animate-spin")} />
                {aiZhCN.idea.swap}
              </button>
            </div>

            <div className="p-5">
              {analysisBusy ? (
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--theme-brand-text)]">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {aiZhCN.idea.analyzePanelBusy}
                </div>
              ) : ideaAnalysis ? (
                <IdeaAnalysisPanel analysis={ideaAnalysis} />
              ) : (
                <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
                  {aiZhCN.idea.analyzePanelEmpty}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type IdeaAnalysisPanelProps = {
  analysis: NonNullable<DashboardCreateController["ideaAnalysis"]>;
};

function IdeaAnalysisPanel({ analysis }: IdeaAnalysisPanelProps) {
  return (
    <div className="space-y-5">
      <p className="text-base font-bold leading-relaxed text-[var(--theme-text-primary)]">
        {analysis.oneLinePitch}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
              推荐书名
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedTitles.map((title) => (
                <span
                  key={title}
                  className="rounded-lg bg-[var(--theme-brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-brand-text)]"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          {analysis.keyPhrases.length > 0 ? (
            <div>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
                关键词
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.keyPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-lg bg-[var(--theme-surface-overlay)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-secondary)]"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
            核心卖点
          </div>
          <div className="space-y-2">
            {analysis.coreSellingPoints.map((point) => (
              <div
                key={point}
                className="rounded-xl bg-[var(--theme-brand-soft)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--theme-brand-text)]"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--theme-surface-overlay)] px-5 py-4 text-sm font-medium text-[var(--theme-text-primary)]">
        <span className="mr-3 font-bold text-[var(--theme-text-strong)]">目标读者</span>
        {analysis.targetReaders}
      </div>
    </div>
  );
}

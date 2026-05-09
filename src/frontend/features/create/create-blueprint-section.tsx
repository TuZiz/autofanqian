"use client";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";
import { CreateIdeaComposer } from "./create-idea-composer";

const TAG_SUGGESTIONS = ["群像", "升级", "经营", "悬疑", "权谋", "爽文", "轻松", "反套路"];

export function CreateBlueprintSection({
  create,
}: {
  create: DashboardCreateController;
}) {
  const {
    customGenreLabel,
    customGenreValidationMessage,
    customTags,
    customTagsInput,
    customWorldDetails,
    effectiveGenreLabel,
    formError,
    formErrorTarget,
    isCustomGenre,
    outlineIdeaRemaining,
    selectedGenre,
    selectedTags,
    setCustomGenreLabel,
    setCustomTagsInput,
    setCustomWorldDetails,
    wordCount,
    MIN_IDEA_LENGTH_FOR_OUTLINE,
  } = create;

  const hasGenreError = formErrorTarget === "genre";
  const hasIdeaError = formErrorTarget === "idea" || formErrorTarget === "ai";
  const inlineIdeaError = formErrorTarget === "idea" ? formError : "";
  const readinessText =
    wordCount >= MIN_IDEA_LENGTH_FOR_OUTLINE
      ? "已达到创建门槛"
      : `还差 ${outlineIdeaRemaining} 字可创建大纲`;
  const helperTitle = !selectedGenre
    ? "先选创作方式"
    : isCustomGenre
      ? "自定义蓝图"
      : `模板起步 · ${effectiveGenreLabel ?? "随机题材"}`;
  const placeholder = isCustomGenre
    ? "点击 AI 生成创意后，这里会自动扩写；也可以直接自己填写完整故事简介。"
    : "模板已经落到这里。继续改成你的主角、你的冲突和你的爽点。";

  function handleTagSuggestionClick(tag: string) {
    if (!isCustomGenre) return;
    const nextTags = new Set(customTags);
    nextTags.add(tag);
    setCustomTagsInput(Array.from(nextTags).join(" "));
  }

  return (
    <section
      id="create-genre-section"
      role="group"
      aria-describedby={hasGenreError || hasIdeaError ? "create-form-error" : undefined}
      data-invalid={hasGenreError || hasIdeaError ? "true" : undefined}
      className="app-compact-panel overflow-hidden rounded-2xl border border-[var(--theme-border)]/60 bg-[var(--theme-bg)]/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
    >
      <div className="border-b border-[var(--theme-border)]/40 bg-gradient-to-r from-emerald-500/8 to-transparent px-5 py-4">
        <h2 className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-500/25">
            1
          </span>
          故事蓝图
        </h2>

        {hasGenreError ? (
          <p className="mt-2.5 text-xs font-bold tracking-wide text-red-600 dark:text-red-400">
            {create.formError}
          </p>
        ) : null}
      </div>

      <div className="border-b border-[var(--theme-border)]/40 px-5 py-4">
        <div
          className={cn(
            "grid gap-4",
            isCustomGenre
              ? "xl:grid-cols-[minmax(180px,0.7fr)_minmax(260px,1fr)_minmax(320px,1.5fr)]"
              : "xl:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1.25fr)]",
          )}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[var(--theme-text-primary)]">题材</span>
            <input
              value={isCustomGenre ? customGenreLabel : effectiveGenreLabel ?? ""}
              onChange={(event) => setCustomGenreLabel(event.target.value)}
              disabled={!isCustomGenre}
              placeholder="例如：赛博修仙"
              className="h-12 w-full rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-overlay)] px-4 text-sm font-bold text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>

          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--theme-text-primary)]">
                标签
                <span className="ml-2 text-xs font-medium text-[var(--theme-text-muted)]">空格或逗号分隔</span>
              </span>
              <input
                value={isCustomGenre ? customTagsInput : selectedTags.join(" ")}
                onChange={(event) => setCustomTagsInput(event.target.value)}
                disabled={!isCustomGenre}
                placeholder="例如：宗门经营 群像 反套路"
                className="h-12 w-full rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-overlay)] px-4 text-sm font-bold text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSuggestionClick(tag)}
                  disabled={!isCustomGenre}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm disabled:cursor-not-allowed disabled:border-[var(--theme-border)] disabled:bg-[var(--theme-surface-overlay)] disabled:text-[var(--theme-text-muted)] dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {isCustomGenre ? (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--theme-text-primary)]">一句话创意</span>
              <input
                value={customWorldDetails}
                onChange={(event) => setCustomWorldDetails(event.target.value)}
                placeholder="例如：修仙靠债务评级，宗门越穷越强"
                className="h-12 w-full rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-surface-overlay)] px-4 text-sm font-bold text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          ) : null}
        </div>

        {customGenreValidationMessage ? (
          <p className="mt-2.5 text-xs font-bold tracking-wide text-red-600 dark:text-red-400">
            {customGenreValidationMessage}
          </p>
        ) : null}
      </div>

      <CreateIdeaComposer
        create={create}
        hasIdeaError={hasIdeaError}
        helperTitle={helperTitle}
        inlineIdeaError={inlineIdeaError}
        placeholder={placeholder}
        readinessText={readinessText}
      />
    </section>
  );
}



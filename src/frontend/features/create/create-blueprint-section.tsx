"use client";

import type { ComponentType, ReactNode } from "react";
import { BookType, Library, Tags } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { CreateIdeaComposer } from "./create-idea-composer";

const TAG_SUGGESTIONS = ["群像", "升级", "经营", "悬疑", "权谋", "感情", "轻松", "反套路"];

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
    selectedTags,
    setCustomGenreLabel,
    setCustomTagsInput,
    setCustomWorldDetails,
  } = create;

  const hasGenreError = formErrorTarget === "genre";
  const hasIdeaError = formErrorTarget === "idea" || formErrorTarget === "ai";
  const inlineIdeaError = formErrorTarget === "idea" ? formError : "";
  const helperTitle = isCustomGenre
    ? "自定义创作设定"
    : `模板起步 · ${effectiveGenreLabel ?? "未命名题材"}`;
  const placeholder = isCustomGenre
    ? "例如：主角继承了一家濒临倒闭的异能侦探事务所，在解决案件时逐渐发现自己才是被追捕的目标。"
    : "在模板基础上补充你的主角、冲突、目标和关键反转，让这部小说真正属于你。";

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
      className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm"
    >
      <div className="border-b border-[var(--theme-border)] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-semibold text-[var(--theme-text-strong)]">
            完善基础设定
          </h2>
          <InfoBadge
            label="当前模式"
            value={isCustomGenre ? "自定义" : "模板创作"}
          />
        </div>

        {hasGenreError ? (
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
            {create.formError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 border-b border-[var(--theme-border)] px-4 py-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <FieldBlock
          icon={BookType}
          label="题材"
          hint={isCustomGenre ? "输入你要创作的题材名称" : "当前模板已为你选定题材"}
        >
          <input
            value={isCustomGenre ? customGenreLabel : effectiveGenreLabel ?? ""}
            onChange={(event) => setCustomGenreLabel(event.target.value)}
            disabled={!isCustomGenre}
            placeholder="例如：赛博修仙、古风悬疑、都市经营"
            className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm font-medium text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/12 disabled:cursor-not-allowed disabled:bg-[var(--theme-surface-overlay)] disabled:text-[var(--theme-text-secondary)]"
          />
        </FieldBlock>

        <FieldBlock
          icon={Tags}
          label="核心标签"
          hint={isCustomGenre ? "至少填写两个标签，帮助系统判断类型与卖点" : "模板自带标签，可直接沿用"}
        >
          <input
            value={isCustomGenre ? customTagsInput : selectedTags.join(" ")}
            onChange={(event) => setCustomTagsInput(event.target.value)}
            disabled={!isCustomGenre}
            placeholder="例如：群像 经营 反套路"
            className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm font-medium text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/12 disabled:cursor-not-allowed disabled:bg-[var(--theme-surface-overlay)] disabled:text-[var(--theme-text-secondary)]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagSuggestionClick(tag)}
                disabled={!isCustomGenre}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tag}
              </button>
            ))}
          </div>
        </FieldBlock>

        <div className={cn("xl:col-span-2", !isCustomGenre && "hidden")}>
          <FieldBlock
            icon={Library}
            label="一句话设定"
            hint="用一句话说清主角、处境和故事引擎"
          >
            <input
              value={customWorldDetails}
              onChange={(event) => setCustomWorldDetails(event.target.value)}
              placeholder="例如：一名被逐出门派的炼器师，为了还债只能靠修复上古法器重建宗门。"
              className="h-10 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm font-medium text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/12"
            />
          </FieldBlock>
        </div>

        {customGenreValidationMessage ? (
          <div className="xl:col-span-2 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {customGenreValidationMessage}
          </div>
        ) : null}
      </div>

      <CreateIdeaComposer
        create={create}
        hasIdeaError={hasIdeaError}
        helperTitle={helperTitle}
        inlineIdeaError={inlineIdeaError}
        placeholder={placeholder}
      />
    </section>
  );
}

function FieldBlock({
  children,
  hint,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-strong)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <span className="mb-1.5 block text-xs leading-5 text-[var(--theme-text-muted)]">{hint}</span>
      {children}
    </label>
  );
}

function InfoBadge({
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

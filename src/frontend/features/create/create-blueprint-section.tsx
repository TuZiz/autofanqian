"use client";

import { type ComponentType, type ReactNode } from "react";
import { BookType, Library, Tags } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

import { CreateIdeaComposer } from "./create-idea-composer";

const TAG_SUGGESTIONS = [
  "群像",
  "升级",
  "经营",
  "悬疑",
  "权谋",
  "感情",
  "轻松",
  "反套路",
];

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
    ? "自定义创作"
    : `模板 · ${effectiveGenreLabel ?? "未命名"}`;
  const placeholder = isCustomGenre
    ? "例如：主角继承了一家濒临倒闭的异能侦探事务所，在解决案件时逐渐发现自己才是被追捕的目标。"
    : "在模板基础上补充你的主角、冲突、目标和关键反转。";

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
      aria-describedby={
        hasGenreError || hasIdeaError ? "create-form-error" : undefined
      }
      data-invalid={hasGenreError || hasIdeaError ? "true" : undefined}
      className="rounded-2xl bg-[var(--theme-surface-solid)]"
    >
      {/* ── 区域标题 ── */}
      <div className="border-b border-[var(--theme-divider)] px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--theme-text-strong)]">
            基础设定
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isCustomGenre
                ? "bg-[var(--theme-text-strong)] text-[var(--theme-bg)]"
                : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
            )}
          >
            {isCustomGenre ? "自定义" : "模板"}
          </span>
        </div>
        {hasGenreError && (
          <p className="mt-2 text-xs font-medium text-red-500">
            {create.formError}
          </p>
        )}
      </div>

      {/* ── 表单区 ── */}
      <div className="space-y-4 border-b border-[var(--theme-divider)] px-5 py-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <FieldBlock
            icon={BookType}
            label="题材"
            hint={
              isCustomGenre
                ? "输入你要创作的题材"
                : "模板已选定"
            }
          >
            <input
              value={
                isCustomGenre ? customGenreLabel : effectiveGenreLabel ?? ""
              }
              onChange={(event) => setCustomGenreLabel(event.target.value)}
              disabled={!isCustomGenre}
              placeholder="赛博修仙、古风悬疑、都市经营"
              className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3.5 text-sm text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] hover:border-[var(--theme-text-muted)] focus:border-[var(--theme-text-strong)] focus:ring-2 focus:ring-[var(--theme-text-strong)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FieldBlock>

          <FieldBlock
            icon={Tags}
            label="核心标签"
            hint={isCustomGenre ? "至少两个，用空格分隔" : "模板自带"}
          >
            <input
              value={isCustomGenre ? customTagsInput : selectedTags.join(" ")}
              onChange={(event) => setCustomTagsInput(event.target.value)}
              disabled={!isCustomGenre}
              placeholder="群像 经营 反套路"
              className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3.5 text-sm text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] hover:border-[var(--theme-text-muted)] focus:border-[var(--theme-text-strong)] focus:ring-2 focus:ring-[var(--theme-text-strong)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSuggestionClick(tag)}
                  disabled={!isCustomGenre}
                  className="rounded-full border border-[var(--theme-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-text-muted)] transition-all hover:border-[var(--theme-text-secondary)] hover:text-[var(--theme-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tag}
                </button>
              ))}
            </div>
          </FieldBlock>
        </div>

        {isCustomGenre && (
          <FieldBlock
            icon={Library}
            label="一句话设定"
            hint="用一句话说清主角、处境和故事引擎"
          >
            <input
              value={customWorldDetails}
              onChange={(event) => setCustomWorldDetails(event.target.value)}
              placeholder="一名被逐出门派的炼器师，为了还债只能靠修复上古法器重建宗门。"
              className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3.5 text-sm text-[var(--theme-text-strong)] outline-none transition-all placeholder:text-[var(--theme-text-muted)] hover:border-[var(--theme-text-muted)] focus:border-[var(--theme-text-strong)] focus:ring-2 focus:ring-[var(--theme-text-strong)]/10"
            />
          </FieldBlock>
        )}

        {customGenreValidationMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/8 dark:text-red-400">
            {customGenreValidationMessage}
          </div>
        )}
      </div>

      {/* ── 创意输入区 ── */}
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
      <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--theme-text-strong)]">
        <Icon className="h-4 w-4 text-[var(--theme-text-muted)]" />
        {label}
      </span>
      <span className="mb-2 block text-[11px] text-[var(--theme-text-muted)]">
        {hint}
      </span>
      {children}
    </label>
  );
}

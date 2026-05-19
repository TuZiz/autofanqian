"use client";

import { type ComponentType, type ReactNode } from "react";
import { AlertCircle, BookType, Library, Tags } from "lucide-react";

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
    <div className="space-y-3">
      <section
        id="create-genre-section"
        role="group"
        aria-describedby={
          hasGenreError || hasIdeaError ? "create-form-error" : undefined
        }
        data-invalid={hasGenreError || hasIdeaError ? "true" : undefined}
        className="rounded-[20px] border border-slate-200/70 bg-white/94 p-4 shadow-[0_18px_44px_-36px_rgba(20,32,29,0.38)] sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              01
            </div>
            <h2 className="mt-1 text-sm font-extrabold tracking-tight text-slate-950">
              基础设定
            </h2>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              isCustomGenre
                ? "create-accent text-white shadow-[0_12px_22px_-18px_rgba(20,32,29,0.78)]"
                : "create-tint text-slate-500 ring-1 ring-slate-200/80",
            )}
          >
            {isCustomGenre ? "自定义" : "模板"}
          </span>
        </div>

        {hasGenreError && (
          <p className="mb-2.5 flex items-start gap-1.5 text-[12px] leading-5 text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {create.formError}
          </p>
        )}

        <div className="grid gap-3 min-[1440px]:grid-cols-2">
          <FieldBlock icon={BookType} label="题材">
            <input
              value={
                isCustomGenre ? customGenreLabel : effectiveGenreLabel ?? ""
              }
              onChange={(event) => setCustomGenreLabel(event.target.value)}
              disabled={!isCustomGenre}
              placeholder="请输入题材，如赛博修仙、古风悬疑、都市经营"
              className="h-10 w-full rounded-xl border border-slate-200/80 create-tint px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FieldBlock>

          <FieldBlock icon={Tags} label="核心标签">
            <input
              value={isCustomGenre ? customTagsInput : selectedTags.join(" ")}
              onChange={(event) => setCustomTagsInput(event.target.value)}
              disabled={!isCustomGenre}
              placeholder="请输入至少两个核心标签，用空格分隔"
              className="h-10 w-full rounded-xl border border-slate-200/80 create-tint px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSuggestionClick(tag)}
                  disabled={!isCustomGenre}
                  className="h-7 rounded-full border border-slate-200/80 create-tint px-2.5 text-xs font-semibold text-slate-500 transition-all hover:border-slate-300 hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tag}
                </button>
              ))}
            </div>
          </FieldBlock>
        </div>

        {isCustomGenre && (
          <FieldBlock icon={Library} label="一句话设定" className="mt-3">
            <input
              value={customWorldDetails}
              onChange={(event) => setCustomWorldDetails(event.target.value)}
              placeholder="请用一句话说清主角、处境和故事引擎"
              className="h-10 w-full rounded-xl border border-slate-200/80 create-tint px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[var(--create-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--create-focus)]"
            />
          </FieldBlock>
        )}

        {customGenreValidationMessage && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-5 text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {customGenreValidationMessage}
          </p>
        )}
      </section>

      <CreateIdeaComposer
        create={create}
        hasIdeaError={hasIdeaError}
        helperTitle={helperTitle}
        inlineIdeaError={inlineIdeaError}
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldBlock({
  children,
  className,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  className?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg create-tint-strong text-slate-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}



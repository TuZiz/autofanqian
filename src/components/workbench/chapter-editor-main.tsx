import { AlertCircle, Check, Copy, FileText, Save } from "lucide-react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

export function ChapterEditorMain({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterIndex,
    content,
    copiedTarget,
    dirty,
    effectiveAiBusy,
    effectiveAiProgress,
    error,
    handleCopy,
    metaSaving,
    outlinePreviewLines,
    saving,
    statusText,
    summaryPreview,
    title,
    updateContent,
    updateTitle,
    wordCount,
    work,
  } = editor;
  const currentChapterLabel = formatChapterLabel(chapterIndex);
  const contextPreview =
    summaryPreview ||
    outlinePreviewLines.join("；") ||
    "暂无本章上下文。可在右侧生成摘要、大纲或细节设定后继续写作。";
  const contextChips = outlinePreviewLines.length
    ? outlinePreviewLines.slice(0, 3)
    : [work?.tag || "写作", currentChapterLabel].filter(Boolean);

  return (
    <div className="flex min-w-0 lg:col-span-8 xl:col-span-9">
      <section className="flex h-full min-h-[1180px] w-full flex-col overflow-hidden rounded-2xl border border-slate-900/[0.08] bg-white/90 shadow-sm shadow-slate-900/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/72 dark:shadow-black/20 xl:min-h-[1320px]">
        <div className="flex flex-col gap-3 border-b border-slate-900/[0.06] px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 font-black text-white dark:bg-white dark:text-slate-950">
              {currentChapterLabel}
            </span>
            <span className="max-w-[12rem] truncate rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
              {work?.tag || "章节写作"}
            </span>
            <SaveInlineStatus
              aiBusy={effectiveAiBusy}
              dirty={dirty}
              error={error}
              metaSaving={metaSaving}
              saving={saving}
              statusText={statusText}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
            <FileText className="h-4 w-4" />
            <span>{wordCount.toLocaleString("zh-CN")} 字</span>
          </div>
        </div>

        {error ? (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/20 sm:mx-5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}

        {effectiveAiBusy ? <AiWritingStatus progress={effectiveAiProgress} /> : null}

        <div className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500">
              标题
            </label>
            <CopyButton
              active={copiedTarget === "title"}
              disabled={!title.trim()}
              onClick={() => void handleCopy("title", title)}
            />
          </div>
          <input
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            disabled={!work || effectiveAiBusy}
            placeholder={`${currentChapterLabel}标题...`}
            className="mb-2 w-full bg-transparent text-2xl font-black leading-tight text-slate-950 outline-none placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-50 dark:placeholder:text-slate-700 sm:text-3xl lg:text-[1.95rem]"
          />

          <div className="mb-3 flex flex-col gap-2 border-y border-slate-900/[0.06] py-2.5 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 dark:text-slate-500">
                <span>上下文</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="normal-case">右侧工具区可编辑</span>
              </div>
              <p className="line-clamp-2 max-w-4xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {contextPreview}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5 lg:justify-end">
              {contextChips.map((item) => (
                <span
                  key={item}
                  className="max-w-[10rem] truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200/70 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3 border-t border-slate-900/[0.06] pt-4 dark:border-white/10">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 dark:text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              正文
            </label>
            <CopyButton
              active={copiedTarget === "content"}
              disabled={!content.trim()}
              onClick={() => void handleCopy("content", content)}
            />
          </div>

          <textarea
            value={content}
            onChange={(event) => updateContent(event.target.value)}
            disabled={!work || effectiveAiBusy}
            placeholder={`在这里开始写${currentChapterLabel}正文...`}
            className="min-h-[900px] w-full flex-1 resize-none rounded-xl border border-transparent bg-transparent px-1 py-2 text-[17px] leading-9 text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-200 focus:bg-slate-50/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-700 dark:focus:border-white/10 dark:focus:bg-white/[0.025] sm:text-lg sm:leading-10 xl:min-h-[1040px]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/[0.06] bg-slate-50/80 px-4 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 sm:px-6">
          <span className="font-bold">自动保存已开启</span>
          <span className="tabular-nums">正文 {wordCount.toLocaleString("zh-CN")} 字</span>
        </div>
      </section>
    </div>
  );
}

function AiWritingStatus({ progress }: { progress: number }) {
  const safeProgress = Math.max(1, Math.min(99, Math.round(progress)));

  return (
    <div className="mx-4 mt-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 shadow-sm shadow-slate-900/[0.02] dark:border-white/10 dark:bg-white/[0.035] sm:mx-5">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
          <span className="truncate">AI 正在生成正文</span>
        </span>
        <span className="shrink-0 tabular-nums">{safeProgress}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

function CopyButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 min-w-[5rem] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/10"
          : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-800 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-slate-200",
      )}
    >
      {active ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{active ? "已复制" : "复制"}</span>
    </button>
  );
}

function SaveInlineStatus({
  aiBusy,
  dirty,
  error,
  metaSaving,
  saving,
  statusText,
}: {
  aiBusy: boolean;
  dirty: boolean;
  error: string;
  metaSaving: boolean;
  saving: boolean;
  statusText: string;
}) {
  const busy = saving || metaSaving;
  const label = error ? "有错误" : aiBusy ? "AI生成中" : busy ? "保存中" : dirty ? "未保存" : statusText;

  return (
    <span
      className={cn(
        "inline-flex max-w-[13rem] items-center gap-1.5 truncate rounded-full px-2.5 py-1 font-black ring-1",
        error
          ? "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/20"
          : aiBusy
            ? "bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-300/20"
            : busy || dirty
              ? "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20",
      )}
    >
      <Save className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

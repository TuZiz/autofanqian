import { Loader2, Sparkles, X } from "lucide-react";

import { getAiMetaCopy } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import {
  compactTextareaClass,
  DialogFrame,
} from "./chapter-editor-dialog-shell";

export function MetaGenerateDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterOutlineText,
    chapterSummary,
    handleConfirmMetaGenerate,
    metaGenerateKind,
    metaGeneratePrompt,
    outlineBusy,
    saving,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    summaryBusy,
  } = editor;

  if (!metaGenerateKind) return null;

  const isSummary = metaGenerateKind === "summary";
  const metaCopy = getAiMetaCopy(metaGenerateKind);
  const busy = isSummary ? summaryBusy : outlineBusy;
  const existingText = isSummary ? chapterSummary.trim() : chapterOutlineText.trim();
  const targetLabel = metaCopy.noun;
  const title = existingText ? metaCopy.regenerate : metaCopy.generate;
  const disabledReason = busy
    ? metaCopy.busyReason
    : saving
      ? "正文正在保存，保存完成后才能生成。"
      : "";

  function closeDialog() {
    if (busy) return;
    setMetaGenerateKind(null);
    setMetaGeneratePrompt("");
  }

  return (
    <DialogFrame
      ariaLabelledBy="meta-generate-title"
      closeDisabled={busy}
      maxWidth="max-w-md"
      onCancel={closeDialog}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-white/50 px-6 py-5 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {targetLabel}
            </p>
            <h3
              id="meta-generate-title"
              className="mt-1 truncate text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
              补充一句要求即可，不填则按当前上下文生成。
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="关闭"
          disabled={busy}
          onClick={closeDialog}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-6 py-6">
        <textarea
          autoFocus
          value={metaGeneratePrompt}
          onChange={(event) => setMetaGeneratePrompt(event.target.value.slice(0, 2000))}
          rows={4}
          placeholder={metaCopy.promptPlaceholder}
          className={cn(compactTextareaClass, "min-h-[140px]")}
        />
        <div className="flex items-start justify-between gap-4 text-xs font-bold">
          <div className="min-w-0 space-y-2">
            {existingText ? (
              <p className="text-amber-700 dark:text-amber-400">
                当前已有内容，生成后会覆盖。
              </p>
            ) : null}
            {disabledReason ? (
              <p className="text-amber-700 dark:text-amber-400">{disabledReason}</p>
            ) : null}
          </div>
          <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
            {metaGeneratePrompt.length}/2000
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)] bg-zinc-50/50 px-6 py-5 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white px-5 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          onClick={closeDialog}
          disabled={busy}
          title={disabledReason || "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          onClick={handleConfirmMetaGenerate}
          disabled={Boolean(disabledReason)}
          title={disabledReason || title}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {title}
        </button>
      </div>
    </DialogFrame>
  );
}

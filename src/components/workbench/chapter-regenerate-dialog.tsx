import { Loader2, Sparkles } from "lucide-react";

import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import {
  DialogFrame,
  DialogHeader,
  DisabledHint,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "./chapter-editor-dialog-shell";

export function RegenerateDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterIndex,
    content,
    effectiveAiBusy,
    handleConfirmRegenerate,
    regenerateOpen,
    regeneratePrompt,
    saving,
    setRegenerateOpen,
    setRegeneratePrompt,
  } = editor;

  if (!regenerateOpen) return null;

  const hasDraft = Boolean(content.trim());
  const closeDialog = () => {
    setRegenerateOpen(false);
    setRegeneratePrompt("");
  };
  const disabledReason = effectiveAiBusy
    ? aiZhCN.common.chapterRunning
    : saving
      ? "正文正在保存，保存完成后才能生成。"
      : "";

  return (
    <DialogFrame
      ariaLabelledBy="regenerate-title"
      closeDisabled={effectiveAiBusy}
      onCancel={closeDialog}
    >
      <DialogHeader
        closeDisabled={effectiveAiBusy}
        description={
          hasDraft
            ? aiZhCN.chapterGenerate.modalDescription(true)
            : aiZhCN.chapterGenerate.modalDescription(false)
        }
        icon={<Sparkles className="h-5 w-5" />}
        kicker={aiZhCN.chapterGenerate.modalKicker(hasDraft)}
        onCancel={closeDialog}
        title={aiZhCN.chapterGenerate.modalTitle(chapterIndex, hasDraft)}
        titleId="regenerate-title"
      />

      <div className="space-y-4 px-6 py-6">
        <textarea
          value={regeneratePrompt}
          onChange={(event) => setRegeneratePrompt(event.target.value.slice(0, 2000))}
          rows={4}
          placeholder={aiZhCN.chapterGenerate.promptPlaceholder}
          className={cn(textareaClass, "min-h-[160px]")}
        />
        {disabledReason ? <DisabledHint>{disabledReason}</DisabledHint> : null}
        <div className="text-right text-xs font-bold text-[var(--theme-text-muted)] tabular-nums">
          {regeneratePrompt.length}/2000
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={closeDialog}
          disabled={effectiveAiBusy}
          title={effectiveAiBusy ? "AI 正在生成，暂时不能关闭。" : "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={handleConfirmRegenerate}
          disabled={Boolean(disabledReason)}
          title={disabledReason || aiZhCN.common.startGenerate}
        >
          {effectiveAiBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {aiZhCN.common.startGenerate}
        </button>
      </div>
    </DialogFrame>
  );
}

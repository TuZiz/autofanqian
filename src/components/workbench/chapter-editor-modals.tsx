import {
  FileText,
  Layers3,
  ListPlus,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BATCH_CHAPTER_COUNT_REQUEST_EVENT,
  resolveBatchChapterCount,
  type BatchChapterCountRequest,
} from "@/lib/workbench/use-chapter-editor-navigation";
import { aiZhCN, getAiMetaCopy } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white";

const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400";

const textareaClass =
  "w-full resize-none rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm font-bold leading-relaxed text-zinc-700 outline-none shadow-sm transition-all placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

const compactTextareaClass =
  "w-full resize-none rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2.5 text-sm font-bold leading-relaxed text-zinc-700 outline-none shadow-sm transition-all placeholder:text-zinc-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

function chapterLabel(index: number) {
  return `第${index}章`;
}

function stopIfDisabled(event: React.MouseEvent, disabled: boolean, onCancel: () => void) {
  if (disabled) return;
  onCancel();
}

function DialogFrame({
  ariaLabelledBy,
  children,
  closeDisabled = false,
  maxWidth = "max-w-2xl",
  onCancel,
}: {
  ariaLabelledBy: string;
  children: ReactNode;
  closeDisabled?: boolean;
  maxWidth?: string;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭弹窗"
        disabled={closeDisabled}
        className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-md transition-opacity disabled:cursor-wait"
        onClick={(event) => stopIfDisabled(event, closeDisabled, onCancel)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "relative z-10 flex max-h-[88vh] w-full animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/90 shadow-2xl shadow-zinc-900/20 ring-1 ring-zinc-900/10 backdrop-blur-2xl dark:border-zinc-800/50 dark:bg-zinc-950/90 dark:shadow-black/30",
          maxWidth,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({
  description,
  icon,
  kicker,
  onCancel,
  title,
  titleId,
  closeDisabled = false,
}: {
  closeDisabled?: boolean;
  description: string;
  icon: ReactNode;
  kicker: string;
  onCancel: () => void;
  title: string;
  titleId: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200/50 bg-white/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-inner ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-300/20">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {kicker}
          </p>
          <h3
            id={titleId}
            className="mt-1 truncate text-xl font-black tracking-tight text-zinc-950 dark:text-white"
          >
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="关闭"
        disabled={closeDisabled}
        onClick={onCancel}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DisabledHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 px-5 py-4 text-sm font-bold leading-relaxed text-amber-700 shadow-inner dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
      {children}
    </div>
  );
}

export function DetailEditorDialog() {
  return <BatchAddChaptersDialog />;
}

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
        <div className="text-right text-xs font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
          {regeneratePrompt.length}/2000
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
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
          {effectiveAiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiZhCN.common.startGenerate}
        </button>
      </div>
    </DialogFrame>
  );
}

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
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200/50 bg-white/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-inner ring-1 ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-300/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {targetLabel}
            </p>
            <h3
              id="meta-generate-title"
              className="mt-1 truncate text-xl font-black tracking-tight text-zinc-950 dark:text-white"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
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
              <p className="text-amber-700 dark:text-amber-400">
                {disabledReason}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
            {metaGeneratePrompt.length}/2000
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
          onClick={closeDialog}
          disabled={busy}
          title={disabledReason || "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400"
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

export function MetaEditorDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    handleConfirmMetaEditor,
    metaEditorKind,
    metaEditorValue,
    metaSaving,
    setMetaEditorKind,
    setMetaEditorValue,
  } = editor;

  if (!metaEditorKind) return null;

  const metaEditorConfig =
    metaEditorKind === "summary"
      ? {
          description: "可手动修正 AI 生成内容；保存后会同步到右侧章节摘要卡片。",
          icon: <FileText className="h-5 w-5" />,
          kicker: "章节摘要",
          limit: 12_000,
          placeholder: "输入本章摘要",
          rows: 7,
          saveHint: "摘要将同步到右侧章节摘要卡。",
          title: "编辑章节摘要",
        }
      : metaEditorKind === "outline"
        ? {
            description: "可手动修正 AI 生成内容；保存后会同步到右侧目标卡与章节大纲卡。",
            icon: <Layers3 className="h-5 w-5" />,
            kicker: "章节大纲",
            limit: 24_000,
            placeholder: "输入本章大纲",
            rows: 8,
            saveHint: "大纲将同步到右侧目标卡与章节大纲卡。",
            title: "编辑章节大纲",
          }
        : {
            description: "按行整理人物关系、关键道具、时间线或能力规则；保存后会同步到右侧细节设定卡。",
            icon: <Target className="h-5 w-5" />,
            kicker: "细节设定",
            limit: 80_000,
            placeholder: "一行一条设定：人物关系、关键道具、时间线、能力规则...",
            rows: 10,
            saveHint: "细节设定会按行保存，并同步到右侧细节设定卡。",
            title: "编辑细节设定",
          };
  const limit = metaEditorConfig.limit;
  const disabledReason = metaSaving ? "正在保存章节信息，请稍后。" : "";

  return (
    <DialogFrame
      ariaLabelledBy="meta-editor-title"
      closeDisabled={metaSaving}
      onCancel={() => setMetaEditorKind(null)}
    >
      <DialogHeader
        closeDisabled={metaSaving}
        description={metaEditorConfig.description}
        icon={metaEditorConfig.icon}
        kicker={metaEditorConfig.kicker}
        onCancel={() => setMetaEditorKind(null)}
        title={metaEditorConfig.title}
        titleId="meta-editor-title"
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <textarea
          autoFocus
          value={metaEditorValue}
          onChange={(event) => setMetaEditorValue(event.target.value.slice(0, limit))}
          rows={metaEditorConfig.rows}
          placeholder={metaEditorConfig.placeholder}
          className={cn(textareaClass, "h-[min(34vh,320px)] min-h-[200px] resize-y")}
        />
        <div className="flex flex-col gap-3 rounded-2xl bg-zinc-50/80 px-5 py-4 text-xs font-bold text-zinc-500 shadow-inner ring-1 ring-zinc-200/50 dark:bg-zinc-900/80 dark:text-zinc-400 dark:ring-zinc-800/50 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate">
            {metaEditorConfig.saveHint}
          </span>
          <span className="shrink-0 tabular-nums">
            {metaEditorValue.length}/{limit}
          </span>
        </div>
        {disabledReason ? <DisabledHint>{disabledReason}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setMetaEditorKind(null)}
          disabled={metaSaving}
          title={metaSaving ? "正在保存，暂时不能关闭。" : "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={handleConfirmMetaEditor}
          disabled={metaSaving}
          title={disabledReason || "保存"}
        >
          {metaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          保存
        </button>
      </div>
    </DialogFrame>
  );
}

function BatchAddChaptersDialog() {
  const activeRequestIdRef = useRef<string | null>(null);
  const [request, setRequest] = useState<(BatchChapterCountRequest & { value: string; error: string }) | null>(
    null,
  );

  function closeBatchDialog() {
    if (activeRequestIdRef.current) {
      resolveBatchChapterCount(activeRequestIdRef.current, null);
      activeRequestIdRef.current = null;
    }
    setRequest(null);
  }

  function confirmBatchAdd() {
    if (!request) return;
    const count = Number.parseInt(request.value, 10);
    if (!Number.isFinite(count) || count < request.min || count > request.max) {
      setRequest((current) =>
        current
          ? {
              ...current,
              error: `请输入 ${request.min}-${request.max} 之间的整数。`,
            }
          : current,
      );
      return;
    }
    if (activeRequestIdRef.current) {
      resolveBatchChapterCount(activeRequestIdRef.current, count);
      activeRequestIdRef.current = null;
    }
    setRequest(null);
  }

  useEffect(() => {
    function handleRequest(event: Event) {
      const detail = (event as CustomEvent<BatchChapterCountRequest>).detail;
      if (!detail?.id) return;
      if (activeRequestIdRef.current) {
        resolveBatchChapterCount(activeRequestIdRef.current, null);
      }
      activeRequestIdRef.current = detail.id;
      setRequest({
        ...detail,
        error: "",
        value: String(detail.defaultCount),
      });
    }

    window.addEventListener(BATCH_CHAPTER_COUNT_REQUEST_EVENT, handleRequest);
    return () => {
      window.removeEventListener(BATCH_CHAPTER_COUNT_REQUEST_EVENT, handleRequest);
      if (activeRequestIdRef.current) {
        resolveBatchChapterCount(activeRequestIdRef.current, null);
        activeRequestIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!request) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeBatchDialog();
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        confirmBatchAdd();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const preview = useMemo(() => {
    if (!request) return "";
    const count = Number.parseInt(request.value, 10);
    if (!Number.isFinite(count) || count <= 0) return "";
    const safeCount = Math.max(request.min, Math.min(request.max, count));
    const endIndex = request.startIndex + safeCount - 1;
    return safeCount === 1
      ? `将创建${chapterLabel(request.startIndex)}。`
      : `将创建${chapterLabel(request.startIndex)}到${chapterLabel(endIndex)}。`;
  }, [request]);

  if (!request) return null;

  return (
    <DialogFrame
      ariaLabelledBy="batch-add-title"
      maxWidth="max-w-lg"
      onCancel={closeBatchDialog}
    >
      <DialogHeader
        description="选择一次要追加的章节数量，系统会从当前最大章节号后继续创建。"
        icon={<ListPlus className="h-5 w-5" />}
        kicker="批量添加"
        onCancel={closeBatchDialog}
        title="批量添加章节"
        titleId="batch-add-title"
      />

      <div className="space-y-4 px-6 py-6">
        <label className="block">
          <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            添加数量
          </span>
          <input
            autoFocus
            inputMode="numeric"
            min={request.min}
            max={request.max}
            type="number"
            value={request.value}
            onChange={(event) =>
              setRequest((current) =>
                current
                  ? {
                      ...current,
                      error: "",
                      value: event.target.value,
                    }
                  : current,
              )
            }
            className="h-14 w-full rounded-2xl border border-zinc-200/80 bg-white/80 px-5 text-xl font-black tabular-nums text-zinc-950 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </label>
        <div className="rounded-2xl border border-zinc-200/50 bg-zinc-50/80 px-5 py-4 text-sm font-bold leading-relaxed text-zinc-600 shadow-inner dark:border-zinc-800/50 dark:bg-zinc-900/80 dark:text-zinc-300">
          {preview || `请输入 ${request.min}-${request.max} 之间的整数。`}
        </div>
        {request.error ? <DisabledHint>{request.error}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} onClick={closeBatchDialog}>
          取消
        </button>
        <button type="button" className={primaryButtonClass} onClick={confirmBatchAdd}>
          <ListPlus className="h-4 w-4" />
          确认添加
        </button>
      </div>
    </DialogFrame>
  );
}

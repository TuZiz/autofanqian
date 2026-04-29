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
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

const secondaryButtonClass =
  "theme-button-secondary inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black active:scale-[0.98] disabled:cursor-not-allowed";
const primaryButtonClass =
  "theme-button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black active:scale-[0.98] disabled:cursor-not-allowed";
const textareaClass =
  "theme-textarea w-full resize-none rounded-2xl px-4 py-3 text-sm font-medium leading-[1.75] outline-none";
const compactTextareaClass =
  "theme-textarea w-full resize-none rounded-xl px-3 py-2.5 text-sm font-medium leading-7 outline-none";

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-5">
      <button
        type="button"
        aria-label="关闭弹窗"
        disabled={closeDisabled}
        className="absolute inset-0 cursor-pointer bg-slate-950/35 backdrop-blur-md transition-opacity disabled:cursor-wait"
        onClick={(event) => stopIfDisabled(event, closeDisabled, onCancel)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "glass-panel relative z-10 flex max-h-[84vh] w-full animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-2xl",
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
    <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-divider)] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] shadow-lg shadow-indigo-500/10 ring-1 ring-[var(--theme-brand-border)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-weak)]">
            {kicker}
          </p>
          <h3
            id={titleId}
            className="mt-1 truncate text-lg font-black tracking-tight text-[var(--theme-text-strong)] sm:text-xl"
          >
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-[1.65] text-[var(--theme-text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="关闭"
        disabled={closeDisabled}
        onClick={onCancel}
        className="theme-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DisabledHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--theme-warning-text)]">
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
    ? "AI 正在生成当前内容，请等待任务结束。"
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
            ? "可补充提示词；确认后会覆盖当前正文，请先确认当前内容不需要保留。"
            : "可补充提示词；确认后开始生成本章正文。"
        }
        icon={<Sparkles className="h-5 w-5" />}
        kicker={hasDraft ? "AI 重写正文" : "AI 生成正文"}
        onCancel={closeDialog}
        title={`${hasDraft ? "重新生成" : "生成"}${chapterLabel(chapterIndex)}`}
        titleId="regenerate-title"
      />

      <div className="space-y-3 px-5 py-4 sm:px-6">
        <textarea
          value={regeneratePrompt}
          onChange={(event) => setRegeneratePrompt(event.target.value.slice(0, 2000))}
          rows={4}
          placeholder="补充提示词（可选）：例如强化悬念、减少旁白、让冲突更直接。"
          className={cn(textareaClass, "min-h-[144px]")}
        />
        {disabledReason ? <DisabledHint>{disabledReason}</DisabledHint> : null}
        <div className="text-right text-xs font-medium text-[var(--theme-text-weak)]">
          {regeneratePrompt.length}/2000
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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
          title={disabledReason || "开始生成"}
        >
          {effectiveAiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          开始生成
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
  const busy = isSummary ? summaryBusy : outlineBusy;
  const existingText = isSummary ? chapterSummary.trim() : chapterOutlineText.trim();
  const targetLabel = isSummary ? "章节摘要" : "章节大纲";
  const title = `${existingText ? "重新生成" : "生成"}${targetLabel}`;
  const disabledReason = busy
    ? `${targetLabel}正在生成，请等待当前任务完成。`
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
      maxWidth="max-w-[460px]"
      onCancel={closeDialog}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--theme-divider)] px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-weak)]">
              {targetLabel}
            </p>
            <h3
              id="meta-generate-title"
              className="mt-0.5 truncate text-lg font-black tracking-tight text-[var(--theme-text-strong)]"
            >
              {title}
            </h3>
            <p className="mt-1 text-xs font-medium leading-5 text-[var(--theme-text-muted)]">
              补充一句要求即可，不填则按当前上下文生成。
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="关闭"
          disabled={busy}
          onClick={closeDialog}
          className="theme-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2.5 px-4 py-3.5">
        <textarea
          autoFocus
          value={metaGeneratePrompt}
          onChange={(event) => setMetaGeneratePrompt(event.target.value.slice(0, 2000))}
          rows={3}
          placeholder={
            isSummary
              ? "例如：突出商业冲突，保留关键人名，摘要更短。"
              : "例如：强化爽点，列出反转节点，结尾钩子更强。"
          }
          className={cn(compactTextareaClass, "min-h-[108px]")}
        />
        <div className="flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0 space-y-1">
            {existingText ? (
              <p className="font-semibold leading-5 text-amber-700 dark:text-amber-300">
                当前已有内容，生成后会覆盖。
              </p>
            ) : null}
            {disabledReason ? (
              <p className="font-semibold leading-5 text-amber-700 dark:text-amber-300">
                {disabledReason}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--theme-text-weak)]">
            {metaGeneratePrompt.length}/2000
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] px-4 py-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="theme-button-secondary inline-flex min-h-9 items-center justify-center rounded-xl px-4 text-sm font-black active:scale-[0.98] disabled:cursor-not-allowed"
          onClick={closeDialog}
          disabled={busy}
          title={disabledReason || "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className="theme-button-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black active:scale-[0.98] disabled:cursor-not-allowed"
          onClick={handleConfirmMetaGenerate}
          disabled={Boolean(disabledReason)}
          title={disabledReason || "开始生成"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          开始生成
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
        <textarea
          autoFocus
          value={metaEditorValue}
          onChange={(event) => setMetaEditorValue(event.target.value.slice(0, limit))}
          rows={metaEditorConfig.rows}
          placeholder={metaEditorConfig.placeholder}
          className={cn(textareaClass, "h-[min(34vh,320px)] min-h-[190px] resize-y")}
        />
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--theme-surface-overlay)] px-4 py-3 text-xs font-medium text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)] sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate">
            {metaEditorConfig.saveHint}
          </span>
          <span className="shrink-0 font-mono font-black tabular-nums text-[var(--theme-text-weak)]">
            {metaEditorValue.length}/{limit}
          </span>
        </div>
        {disabledReason ? <DisabledHint>{disabledReason}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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

      <div className="space-y-3 px-5 py-4 sm:px-6">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[var(--theme-text-weak)]">
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
            className="theme-input h-14 w-full rounded-2xl px-4 text-lg font-black tabular-nums outline-none"
          />
        </label>
        <div className="rounded-2xl bg-[var(--theme-surface-overlay)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]">
          {preview || `请输入 ${request.min}-${request.max} 之间的整数。`}
        </div>
        {request.error ? <DisabledHint>{request.error}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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

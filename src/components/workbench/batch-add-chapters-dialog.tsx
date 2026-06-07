import { ListPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BATCH_CHAPTER_COUNT_REQUEST_EVENT,
  resolveBatchChapterCount,
  type BatchChapterCountRequest,
} from "@/lib/workbench/use-chapter-editor-navigation";
import {
  DialogFrame,
  DialogHeader,
  DisabledHint,
  primaryButtonClass,
  secondaryButtonClass,
} from "./chapter-editor-dialog-shell";

function chapterLabel(index: number) {
  return `第${index}章`;
}

export function BatchAddChaptersDialog() {
  const activeRequestIdRef = useRef<string | null>(null);
  const [request, setRequest] = useState<
    (BatchChapterCountRequest & { value: string; error: string }) | null
  >(null);

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
          <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
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
            className="h-14 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-5 text-xl font-medium tabular-nums text-[var(--theme-text-strong)] outline-none shadow-sm transition-all focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-border)]"
          />
        </label>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-5 py-4 text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)] shadow-inner">
          {preview || `请输入 ${request.min}-${request.max} 之间的整数。`}
        </div>
        {request.error ? <DisabledHint>{request.error}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-5 sm:flex-row sm:justify-end">
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

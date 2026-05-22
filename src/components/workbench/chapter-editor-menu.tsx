import { ChevronDown, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { formatWorkbenchDocumentLabel } from "@/lib/workbench/work-document-label";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

type ChapterEditorMenuProps = {
  editor: WorkChapterEditorController;
  nextChapterLabel: string;
};

export function ChapterEditorMenu({ editor, nextChapterLabel }: ChapterEditorMenuProps) {
  const {
    chapterIndex,
    chapterMenuFocusNonce,
    chapterMenuChapters,
    chapterMenuOpen,
    chapterMenuVolumeLabel,
    commandQuery,
    dirty,
    effectiveAiBusy,
    goToChapter,
    handleBatchAddChapters,
    metaSaving,
    requestChapterMenuSearchFocus,
    saving,
    setChapterMenuOpen,
    setCommandQuery,
    title,
    work,
  } = editor;
  const actionLocked = !work || dirty || saving || effectiveAiBusy || metaSaving;
  const disabledReason = getNavigationDisabledReason({
    dirty,
    effectiveAiBusy,
    metaSaving,
    saving,
    work,
  });
  const chapterMenuRef = useRef<HTMLDivElement | null>(null);
  const chapterSearchInputRef = useRef<HTMLInputElement | null>(null);
  const chapterMenuCloseTimerRef = useRef<number | null>(null);
  const handledFocusNonceRef = useRef(0);
  const isShortStory = isShortStoryWork(work?.workType);
  const currentChapterLabel = formatWorkbenchDocumentLabel(chapterIndex, work?.workType);

  const clearChapterMenuCloseTimer = useCallback(() => {
    if (!chapterMenuCloseTimerRef.current) return;
    window.clearTimeout(chapterMenuCloseTimerRef.current);
    chapterMenuCloseTimerRef.current = null;
  }, []);

  const closeChapterMenu = useCallback((options?: { clearQuery?: boolean }) => {
    clearChapterMenuCloseTimer();
    setChapterMenuOpen(false);
    if (options?.clearQuery ?? true) setCommandQuery("");
  }, [clearChapterMenuCloseTimer, setChapterMenuOpen, setCommandQuery]);

  const openChapterMenu = useCallback((options?: { focusSearch?: boolean; resetQuery?: boolean }) => {
    if (!work) return;
    clearChapterMenuCloseTimer();
    if (options?.resetQuery) setCommandQuery("");
    if (options?.focusSearch) requestChapterMenuSearchFocus();
    setChapterMenuOpen(true);
  }, [
    clearChapterMenuCloseTimer,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandQuery,
    work,
  ]);

  const scheduleChapterMenuClose = useCallback(() => {
    clearChapterMenuCloseTimer();
    chapterMenuCloseTimerRef.current = window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement && chapterMenuRef.current?.contains(activeElement)) {
        chapterMenuCloseTimerRef.current = null;
        return;
      }
      closeChapterMenu();
      chapterMenuCloseTimerRef.current = null;
    }, 140);
  }, [clearChapterMenuCloseTimer, closeChapterMenu]);

  useEffect(() => {
    if (!chapterMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && chapterMenuRef.current?.contains(target)) return;
      closeChapterMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeChapterMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [chapterMenuOpen, closeChapterMenu]);

  useEffect(() => {
    if (!work && chapterMenuOpen) closeChapterMenu();
  }, [chapterMenuOpen, closeChapterMenu, work]);

  useEffect(() => {
    if (!chapterMenuOpen || handledFocusNonceRef.current === chapterMenuFocusNonce) return;
    handledFocusNonceRef.current = chapterMenuFocusNonce;
    window.requestAnimationFrame(() => {
      chapterSearchInputRef.current?.focus({ preventScroll: true });
      chapterSearchInputRef.current?.select();
    });
  }, [chapterMenuFocusNonce, chapterMenuOpen]);

  useEffect(() => {
    if (!chapterMenuOpen) return;
    window.requestAnimationFrame(() => {
      chapterMenuRef.current
        ?.querySelector<HTMLElement>('[data-current-chapter="true"]')
        ?.scrollIntoView({ block: "center" });
    });
  }, [chapterMenuOpen, chapterIndex]);

  useEffect(() => () => clearChapterMenuCloseTimer(), [clearChapterMenuCloseTimer]);

  return (
    <div
      ref={chapterMenuRef}
      className="relative min-w-0"
      onPointerEnter={() => openChapterMenu()}
      onPointerLeave={scheduleChapterMenuClose}
    >
      <button
        type="button"
        aria-expanded={chapterMenuOpen}
        aria-haspopup="listbox"
        disabled={!work}
        onClick={() => {
          openChapterMenu({ focusSearch: true, resetQuery: true });
        }}
        className="group flex min-w-0 max-w-[45vw] items-center gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-[var(--theme-border)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:ring-[var(--theme-border)] dark:hover:bg-zinc-800 dark:hover:ring-[var(--theme-border)] sm:max-w-[52vw] lg:max-w-[34rem]"
      >
        <span className="min-w-0 truncate text-sm font-semibold leading-none text-zinc-950 dark:text-zinc-100 sm:text-base">
          {currentChapterLabel}
          {title ? (
            <span className="font-bold text-zinc-500 dark:text-zinc-400">：{title}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
            chapterMenuOpen && "rotate-180 text-emerald-600 dark:text-emerald-400",
          )}
        />
      </button>

      {chapterMenuOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 flex w-[min(32rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-lg shadow-zinc-950/20 ring-1 ring-[var(--theme-border)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-black/30 dark:ring-[var(--theme-border)]">
          <div className="absolute -top-2 left-0 h-2 w-full" />
          <div className="space-y-3 border-b border-[var(--theme-border)] bg-white/50 px-5 py-4 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
            <div className="flex items-center justify-between gap-3">
              <p className="line-clamp-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                {chapterMenuVolumeLabel}
              </p>
              <kbd className="hidden shrink-0 rounded-lg border border-[var(--theme-border)] bg-zinc-50/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-500 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-400 sm:block">
                Ctrl K
              </kbd>
            </div>
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-white/80 px-4 text-sm text-zinc-500 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-400 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
              <Search className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <span className="sr-only">{isShortStory ? "搜索正文段落" : "搜索章节"}</span>
              <input
                ref={chapterSearchInputRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                    event.stopPropagation();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent font-bold text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder={isShortStory ? "搜索正文、Beat 或关键词..." : "搜索章节名、卷号或关键词..."}
              />
            </label>
            {disabledReason ? (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700 shadow-inner dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                {disabledReason}
              </div>
            ) : null}
          </div>

          <ChapterMenuList
            actionLocked={actionLocked}
            chapterIndex={chapterIndex}
            chapters={chapterMenuChapters}
            commandQuery={commandQuery}
            disabledReason={disabledReason}
            goToChapter={goToChapter}
            onClose={closeChapterMenu}
            workType={work?.workType}
          />

          <div className="border-t border-[var(--theme-border)] bg-zinc-50/50 p-3 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
            <button
              type="button"
              disabled={isShortStory || actionLocked}
              title={disabledReason || `从${nextChapterLabel}开始新增${isShortStory ? "场景" : "章节"}`}
              onClick={() => {
                closeChapterMenu();
                void handleBatchAddChapters();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white px-4 py-3 text-xs font-semibold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
            >
              <Plus className="h-4 w-4" />
              {isShortStory ? "短篇正文以一篇完结为主" : `新增章节 · ${nextChapterLabel}起`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChapterMenuList({
  actionLocked,
  chapterIndex,
  chapters,
  commandQuery,
  disabledReason,
  goToChapter,
  onClose,
  workType,
}: {
  actionLocked: boolean;
  chapterIndex: number;
  chapters: WorkChapterEditorController["chapterMenuChapters"];
  commandQuery: string;
  disabledReason: string;
  goToChapter: WorkChapterEditorController["goToChapter"];
  onClose: () => void;
  workType?: string | null;
}) {
  const isShortStory = isShortStoryWork(workType);
  return (
    <div
      className="max-h-[min(52vh,420px)] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="listbox"
    >
      {chapters.length ? (
        chapters.map((item) => {
          const active = item.index === chapterIndex;
          const edited = item.wordCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={actionLocked}
              title={disabledReason || `${formatWorkbenchDocumentLabel(item.index, workType)}：${item.title || "未命名"}`}
              onClick={() => {
                onClose();
                void goToChapter(item.index);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-all",
                active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "group text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-white/[0.06]",
              )}
              role="option"
              aria-selected={active}
              data-current-chapter={active ? "true" : undefined}
            >
              <span className="min-w-0 truncate text-sm font-semibold">
                {formatWorkbenchDocumentLabel(item.index, workType)}：{item.title || (isShortStory ? "短篇正文" : "未命名")}
              </span>
              {active ? (
                <span className="shrink-0 rounded-lg bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                  当前
                </span>
              ) : edited ? (
                <span className="shrink-0 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  已写
                </span>
              ) : null}
            </button>
          );
        })
      ) : (
        <div className="px-4 py-10 text-center text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {commandQuery.trim()
            ? isShortStory
              ? "没有匹配的场景。"
              : "没有匹配的章节。"
            : isShortStory
              ? "暂无可以切换的场景。"
              : "暂无可以切换的章节。"}
        </div>
      )}
    </div>
  );
}

function getNavigationDisabledReason({
  dirty,
  effectiveAiBusy,
  metaSaving,
  saving,
  work,
}: Pick<
  WorkChapterEditorController,
  "dirty" | "effectiveAiBusy" | "metaSaving" | "saving" | "work"
>) {
  const unit = isShortStoryWork(work?.workType) ? "正文" : "章节";
  if (!work) return "作品数据还没有加载完成，暂时不能切换或新增章节。";
  if (dirty) return `当前${unit}还有未保存内容，保存完成后才能切换或新增。`;
  if (saving) return `正文正在保存，保存完成后才能切换或新增${unit}。`;
  if (effectiveAiBusy) return aiZhCN.common.chapterBusy;
  if (metaSaving) return "章节设定正在保存，请稍后再操作。";
  return "";
}

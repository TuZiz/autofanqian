import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

export function ChapterEditorHeader({ editor }: { editor: WorkChapterEditorController }) {
  const {
    aiButtonLabel,
    aiStageMessage,
    chapterIndex,
    chapterMenuFocusNonce,
    chapterMenuChapters,
    chapterMenuOpen,
    chapterMenuVolumeLabel,
    commandQuery,
    dirty,
    effectiveAiBusy,
    effectiveAiProgress,
    error,
    goToChapter,
    handleBatchAddChapters,
    handleAiActionClick,
    metaSaving,
    isAdmin,
    maxChapterIndex,
    requestChapterMenuSearchFocus,
    saving,
    setChapterMenuOpen,
    setCommandQuery,
    statusText,
    title,
    userEmail,
    work,
    workId,
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
  const currentChapterLabel = formatChapterLabel(chapterIndex);
  const nextChapterLabel = formatChapterLabel(Math.max(chapterIndex, maxChapterIndex) + 1);
  const aiLabel = normalizeChapterCopy(effectiveAiBusy ? aiStageMessage : aiButtonLabel);
  const progress = Math.round(Math.max(0, Math.min(100, effectiveAiProgress)));

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
    <header className="sticky top-0 z-50 border-b border-zinc-200/50 bg-white/70 shadow-sm shadow-black/5 backdrop-blur-2xl dark:border-white/5 dark:bg-black/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-12 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              title="返回作品面板"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="hidden h-5 w-px bg-zinc-200 dark:bg-white/10 sm:block" />

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
                className="group flex min-w-0 max-w-[45vw] items-center gap-2 rounded-xl border border-zinc-200 bg-white/75 px-2.5 py-2 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/15 dark:hover:bg-white/[0.08] sm:max-w-[52vw] sm:px-3 lg:max-w-[34rem]"
              >
                <span className="min-w-0 truncate text-sm font-black leading-none text-zinc-950 dark:text-zinc-100 sm:text-base">
                  {currentChapterLabel}
                  {title ? (
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      ：{title}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:text-blue-600 dark:group-hover:text-sky-300",
                    chapterMenuOpen && "rotate-180 text-blue-600 dark:text-blue-300",
                  )}
                />
              </button>

              {chapterMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 flex w-[min(32rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl shadow-stone-900/12 ring-1 ring-stone-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-black/50">
                  <div className="absolute -top-2 left-0 h-2 w-full" />
                  <div className="space-y-3 border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-[11px] font-black text-zinc-500 dark:text-zinc-400">
                        {chapterMenuVolumeLabel}
                      </p>
                      <kbd className="hidden shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-black text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 sm:block">
                        Ctrl K
                      </kbd>
                    </div>
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 text-sm text-zinc-500 ring-1 ring-transparent transition-colors focus-within:border-blue-200 focus-within:bg-white focus-within:ring-blue-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:focus-within:border-blue-300/30 dark:focus-within:bg-white/[0.06] dark:focus-within:ring-blue-300/10">
                      <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                      <span className="sr-only">搜索章节</span>
                      <input
                        ref={chapterSearchInputRef}
                        value={commandQuery}
                        onChange={(event) => setCommandQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                            event.stopPropagation();
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent font-semibold text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        placeholder="搜索章节名、章节号或关键词..."
                      />
                    </label>
                    {disabledReason ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
                        {disabledReason}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="max-h-[min(52vh,420px)] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="listbox"
                  >
                    {chapterMenuChapters.length ? (
                      chapterMenuChapters.map((item) => {
                        const active = item.index === chapterIndex;
                        const edited = item.wordCount > 0;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={actionLocked}
                            title={disabledReason || `${formatChapterLabel(item.index)}：${item.title || "未命名"}`}
                            onClick={() => {
                              closeChapterMenu();
                              void goToChapter(item.index);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              active
                                ? "bg-sky-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                                : "group text-stone-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-300 dark:hover:bg-white/[0.06]",
                            )}
                            role="option"
                            aria-selected={active}
                            data-current-chapter={active ? "true" : undefined}
                          >
                            <span className="min-w-0 truncate text-sm font-bold">
                              {formatChapterLabel(item.index)}：{item.title || "未命名"}
                            </span>
                            {active ? (
                              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">
                                当前
                              </span>
                            ) : edited ? (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                已写
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {commandQuery.trim() ? "没有匹配的章节。" : "暂无可切换章节。"}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/80 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                    <button
                      type="button"
                      disabled={actionLocked}
                      title={disabledReason || `从${nextChapterLabel}开始新增章节`}
                      onClick={() => {
                        closeChapterMenu();
                        void handleBatchAddChapters();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-stone-600 ring-1 ring-stone-200 transition-colors hover:bg-sky-50 hover:text-blue-700 hover:ring-sky-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white disabled:text-zinc-400 disabled:hover:bg-white disabled:hover:ring-stone-200 dark:bg-white/[0.03] dark:text-stone-300 dark:ring-white/10 dark:hover:bg-blue-400/10 dark:hover:text-blue-200 dark:hover:ring-sky-300/20 dark:disabled:text-zinc-500 dark:disabled:hover:bg-white/[0.03] dark:disabled:hover:ring-white/10"
                    >
                      <Plus className="h-4 w-4" />
                      新增章节 · {nextChapterLabel}起
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <SaveStatusPill
              dirty={dirty}
              error={error}
              metaSaving={metaSaving}
              saving={saving}
              statusText={statusText}
              aiBusy={effectiveAiBusy}
              aiLabel={aiStageMessage}
              aiProgress={progress}
            />
            <span className="max-w-28 truncate text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
              {userEmail?.split("@")[0]}
            </span>
          </div>

          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-xs sm:font-black"
              title="管理员"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">管理员</span>
            </Link>
          ) : null}

          <PrimaryAiButton
            busy={effectiveAiBusy}
            disabled={!work || saving || effectiveAiBusy}
            label={aiLabel}
            progress={progress}
            onClick={handleAiActionClick}
          />
          <ThemeToggle className="h-9 w-9 shrink-0 rounded-lg text-zinc-500 hover:bg-stone-900/[0.06] hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <SaveStatusPill
            dirty={dirty}
            error={error}
            metaSaving={metaSaving}
            saving={saving}
            statusText={statusText}
            aiBusy={effectiveAiBusy}
            aiLabel={aiStageMessage}
            aiProgress={progress}
          />
          <span className="min-w-0 truncate text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
            {userEmail?.split("@")[0]}
          </span>
        </div>
      </div>
    </header>
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
  if (!work) return "作品数据还没有加载完成，暂时不能切换或新增章节。";
  if (dirty) return "当前章节还有未保存内容，保存完成后才能切换或新增。";
  if (saving) return "正文正在保存，保存完成后才能切换或新增章节。";
  if (effectiveAiBusy) return aiZhCN.common.chapterBusy;
  if (metaSaving) return "章节设定正在保存，请稍后再操作。";
  return "";
}

function PrimaryAiButton({
  busy,
  disabled,
  label,
  onClick,
  progress,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  progress: number;
}) {
  const compactLabel = getCompactAiLabel(label, busy, progress);
  const ariaLabel = busy ? `AI 正在生成正文，当前进度 ${progress}%` : label;

  return (
    <button
      type="button"
      aria-busy={busy}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex h-9 max-w-[7.5rem] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-3 text-xs font-black shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:max-w-[13rem] sm:px-4",
        busy
          ? "cursor-default border-sky-200 bg-sky-50 text-blue-700 shadow-inner shadow-blue-500/[0.04] hover:border-sky-200 hover:bg-sky-50 disabled:opacity-100 dark:border-blue-300/20 dark:bg-blue-400/10 dark:text-blue-200 dark:hover:bg-blue-400/10"
          : "border-transparent bg-stone-950 text-white hover:-transtone-y-0.5 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-sky-400 dark:hover:shadow-blue-500/20",
      )}
    >
      {busy ? (
        <span className="relative h-2 w-2 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
      ) : (
        <Sparkles className="relative h-4 w-4 shrink-0" />
      )}
      <span className="relative hidden min-w-0 truncate min-[390px]:block">{label}</span>
      <span className="relative min-w-0 truncate min-[390px]:hidden">{compactLabel}</span>
      {busy ? (
        <span className="relative hidden rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] tabular-nums text-blue-700 dark:bg-blue-300/10 dark:text-blue-200 sm:block">
          {progress}%
        </span>
      ) : null}
    </button>
  );
}

function getCompactAiLabel(label: string, busy: boolean, progress: number) {
  if (busy) return `生成中 ${progress}%`;
  if (label.startsWith("先补第")) return label;
  if (label.includes("重新生成第1章")) return "重写第1章";
  if (label.includes("重新生成")) return "重写";
  if (label.includes("AI 生成第1章")) return "生成第1章";
  if (label.includes("AI 生成")) return "生成";
  return label.length > 6 ? label.slice(0, 6) : label;
}

function SaveStatusPill({
  aiBusy,
  aiLabel,
  aiProgress,
  dirty,
  error,
  metaSaving,
  saving,
  statusText,
}: {
  aiBusy: boolean;
  aiLabel: string;
  aiProgress: number;
  dirty: boolean;
  error: string;
  metaSaving: boolean;
  saving: boolean;
  statusText: string;
}) {
  if (error) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/20">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">有错误</span>
      </span>
    );
  }

  if (aiBusy) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-200/70 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-300/20">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
        <span className="truncate">{normalizeChapterCopy(aiLabel || `AI生成 ${aiProgress}%`)}</span>
      </span>
    );
  }

  if (saving || metaSaving) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="truncate">保存中</span>
      </span>
    );
  }

  if (dirty) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-400/10 dark:text-orange-200 dark:ring-orange-300/20">
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">未保存</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{normalizeChapterCopy(statusText)}</span>
    </span>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

function normalizeChapterCopy(value: string) {
  const chineseDigits: Record<string, string> = {
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
    十: "10",
  };

  return value
    .replace(/第\s*(\d+)\s*章/g, "第$1章")
    .replace(/第([一二三四五六七八九十])章/g, (_, digit: string) => `第${chineseDigits[digit] ?? digit}章`);
}

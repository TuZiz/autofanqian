import { Search } from "lucide-react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

function chapterLabel(index: number) {
  return `第${index}章`;
}

function chapterDisplayTitle(item: { index: number; title: string | null }) {
  return `${chapterLabel(item.index)}：${item.title?.trim() || "未命名章节"}`;
}

function getDisabledReason({
  dirty,
  effectiveAiBusy,
  metaSaving,
  saving,
  work,
}: Pick<
  WorkChapterEditorController,
  "dirty" | "effectiveAiBusy" | "metaSaving" | "saving" | "work"
>) {
  if (!work) return "作品数据还没有加载完成，暂时不能切换章节。";
  if (dirty) return "当前章节还有未保存内容，保存完成后才能切换。";
  if (saving) return "正文正在保存，保存完成后才能切换章节。";
  if (effectiveAiBusy) return "AI 正在处理当前章节，请等待任务完成。";
  if (metaSaving) return "章节设定正在保存，请稍后再切换。";
  return "";
}

export function ChapterCommandDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterIndex,
    commandChapters,
    commandOpen,
    commandQuery,
    dirty,
    effectiveAiBusy,
    goToChapter,
    metaSaving,
    saving,
    setCommandOpen,
    setCommandQuery,
    work,
  } = editor;

  if (!commandOpen) return null;

  const disabledReason = getDisabledReason({
    dirty,
    effectiveAiBusy,
    metaSaving,
    saving,
    work,
  });
  const navigationDisabled = Boolean(disabledReason);

  function closeDialog() {
    setCommandOpen(false);
    setCommandQuery("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <button
        type="button"
        aria-label="关闭章节命令面板"
        className="absolute inset-0 cursor-pointer bg-slate-950/30 backdrop-blur-md transition-opacity"
        onClick={closeDialog}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-command-title"
        className="glass-panel relative flex max-h-[78vh] w-full max-w-2xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-[32px]"
      >
        <div className="flex items-center gap-4 border-b border-[var(--theme-divider)] px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
            <Search className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="chapter-command-title"
              className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-text-weak)]"
            >
              章节导航
            </p>
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              className="mt-1 w-full bg-transparent text-lg font-black tracking-tight text-[var(--theme-text-strong)] outline-none placeholder:text-[var(--theme-text-weak)]"
              placeholder="搜索章节标题、作品名或第1章"
            />
          </div>
          <kbd className="hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wide text-[var(--theme-text-muted)] shadow-sm sm:block">
            Esc
          </kbd>
        </div>

        {navigationDisabled ? (
          <div className="mx-5 mt-4 rounded-2xl border border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--theme-warning-text)] sm:mx-6">
            {disabledReason}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-weak)]">
              {commandQuery.trim() ? "匹配章节" : "按章节顺序"}
              {work?.title ? ` · ${work.title}` : ""}
            </span>
          </div>

          {commandChapters.length ? (
            commandChapters.map((item) => {
              const active = item.index === chapterIndex;
              const edited = item.wordCount > 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={navigationDisabled}
                  title={navigationDisabled ? disabledReason : chapterDisplayTitle(item)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    closeDialog();
                    void goToChapter(item.index);
                  }}
                  className={cn(
                    "group relative mb-1 flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-border)]",
                    active
                      ? "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]"
                      : "text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-overlay)] disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[var(--theme-brand-500)]" />
                  ) : null}

                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={cn(
                        "flex h-10 min-w-16 shrink-0 items-center justify-center rounded-2xl px-3 text-xs font-black tabular-nums ring-1 transition-all",
                        active
                          ? "bg-[var(--theme-surface-hover)] text-[var(--theme-brand-600)] ring-[var(--theme-brand-border)]"
                          : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] ring-[var(--theme-border)] group-hover:text-[var(--theme-brand-600)]",
                      )}
                    >
                      {chapterLabel(item.index)}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 truncate text-sm font-bold leading-6 transition-colors",
                        active
                          ? "text-[var(--theme-brand-text)]"
                          : "text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-strong)]",
                      )}
                    >
                      {item.title?.trim() || "未命名章节"}
                    </span>
                  </div>

                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    {active ? (
                      <span className="rounded-full bg-[var(--theme-brand-subtle)] px-2.5 py-1 text-[10px] font-black text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
                        当前
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-black ring-1",
                          edited
                            ? "bg-[var(--theme-success-soft)] text-[var(--theme-success-text)] ring-[var(--theme-success-border)]"
                            : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] ring-[var(--theme-border)]",
                        )}
                      >
                        {edited ? "已写" : "空章"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center text-sm font-semibold text-[var(--theme-text-muted)]">
              没有匹配的章节。
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] px-5 py-4 text-xs text-[var(--theme-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold">
            当前定位：{chapterLabel(chapterIndex)}
          </span>
          <span>{navigationDisabled ? "先处理上方提示后再切换章节" : "点击任一章节打开"}</span>
        </div>
      </div>
    </div>
  );
}

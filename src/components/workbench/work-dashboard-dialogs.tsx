import { Edit3, PenLine, Search, Wand2 } from "lucide-react";

import {
  formatChapterDisplayTitle,
  formatChapterLabel,
} from "@/lib/workbench/work-dashboard-format";
import { DEFAULT_PLANNING_CONFIG } from "@/lib/create/progressive-planning";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

export function WorkChapterCommandDialog({
  dashboard,
}: {
  dashboard: WorkDashboardController;
}) {
  const {
    commandChapters,
    commandOpen,
    commandQuery,
    goToChapter,
    latestEditedChapter,
    nextChapterExists,
    nextChapterIndex,
    setCommandOpen,
    setCommandQuery,
    work,
  } = dashboard;

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[7vh] sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label="章节切换">
      <button
        type="button"
        aria-label="关闭章节切换"
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={() => {
          setCommandOpen(false);
          setCommandQuery("");
        }}
      />

      <div className="relative flex max-h-[82vh] w-full max-w-4xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl">
        <div className="grid gap-4 border-b border-[var(--theme-border)]/50 bg-[var(--theme-surface-soft)] p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-5 py-4 shadow-sm transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-4 focus-within:ring-[var(--theme-brand-border)]">
            <Search className="h-5 w-5 shrink-0 text-[var(--theme-text-muted)]" />
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium tracking-tight text-[var(--theme-text-strong)] outline-none placeholder:text-[var(--theme-text-muted)]"
              placeholder="搜索章节名、卷号或关键字..."
            />
            <kbd className="hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2.5 py-1 font-mono text-[11px] font-bold tracking-widest text-[var(--theme-text-muted)] shadow-sm sm:block">
              ESC
            </kbd>
          </div>
          <button
            type="button"
            disabled={!work}
            onClick={() => {
              setCommandOpen(false);
              setCommandQuery("");
              goToChapter(nextChapterIndex);
            }}
            className="theme-brand-gradient-bg inline-flex h-[60px] items-center justify-center gap-3 rounded-2xl px-6 text-sm font-semibold text-white shadow-[var(--theme-shadow-button)] transition-all hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PenLine className="h-5 w-5" />
            <span>继续写作：{formatChapterLabel(nextChapterIndex)}</span>
          </button>
        </div>

        <div className="border-b border-[var(--theme-border)]/50 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
                Chapter Navigator
              </p>
              <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                {commandQuery.trim() ? "匹配章节" : "章节列表"}
                {work?.title ? ` · ${work.title}` : ""}
              </h3>
            </div>
            <span className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] shadow-sm">
              点击章节打开
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {commandChapters.length ? (
            commandChapters.map((chapter) => {
              const active = chapter.index === nextChapterIndex;
              const edited = chapter.wordCount > 0;
              const recent = chapter.index === latestEditedChapter?.index;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandQuery("");
                    goToChapter(chapter.index);
                  }}
                  className={
                    active
                      ? "mb-2 flex min-h-[72px] w-full cursor-pointer items-center justify-between rounded-2xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-5 py-4 text-left shadow-sm ring-1 ring-[var(--theme-brand-border)]/50"
                      : "group mb-2 flex min-h-[72px] w-full cursor-pointer items-center justify-between rounded-2xl border border-transparent px-5 py-4 text-left transition-all hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface-soft)] hover:shadow-sm"
                  }
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={
                        active
                          ? "theme-brand-gradient-bg flex h-12 min-w-20 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-white shadow-sm"
                          : "flex h-12 min-w-20 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-3 text-xs font-bold text-[var(--theme-text-muted)] shadow-sm transition-all group-hover:border-[var(--theme-border)] group-hover:text-[var(--theme-text-strong)]"
                      }
                    >
                      {formatChapterLabel(chapter.index)}
                    </div>
                    <span
                      className={
                        active
                          ? "truncate text-base font-bold text-[var(--theme-text-strong)]"
                          : "truncate text-sm font-bold text-[var(--theme-text-secondary)] transition-colors group-hover:text-[var(--theme-text-strong)]"
                      }
                    >
                      {formatChapterDisplayTitle(chapter)}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    {active ? (
                      <>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-brand-text)]">
                          {nextChapterExists ? "继续写作" : "下一章"}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-[var(--theme-brand-500)] shadow-[0_0_12px_rgba(14,165,233,0.6)]" />
                      </>
                    ) : (
                      <span
                        className={
                          recent
                            ? "rounded-lg border border-[var(--theme-brand-700)]/80 bg-[var(--theme-brand-subtle)]/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-brand-700)] shadow-sm"
                            : edited
                              ? "rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-brand-text)] shadow-sm"
                              : "rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] shadow-sm"
                        }
                      >
                        {recent ? "最近完成" : edited ? "已写" : "草稿"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center text-sm font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
              没有匹配的章节。
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--theme-border)]/50 bg-[var(--theme-surface-soft)] px-6 py-4 text-xs font-bold text-[var(--theme-text-muted)]">
          <span>共 {commandChapters.length} 个章节结构</span>
          <span>{commandQuery.trim() ? "清空搜索可查看全部章节" : "Ctrl+K 可再次打开"}</span>
        </div>
      </div>
    </div>
  );
}

export function OutlineRefineDialog({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    handleRefineOutline,
    outlineExtensionSize,
    outlineRefineBusy,
    outlineRefineConfirmOpen,
    outlineRefineError,
    outlineRefineSupplement,
    setOutlineRefineConfirmOpen,
    setOutlineRefineSupplement,
    work,
  } = dashboard;

  if (!outlineRefineConfirmOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-label="规划下一段确认">
      <button
        type="button"
        aria-label="关闭规划下一段确认"
        disabled={outlineRefineBusy}
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity disabled:cursor-wait"
        onClick={() => setOutlineRefineConfirmOpen(false)}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--theme-brand-soft)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-[var(--theme-brand-subtle)] blur-3xl" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-lg shadow-[var(--theme-brand-500)]/10 ring-1 ring-[var(--theme-brand-border)]/10">
              <Edit3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
                渐进规划
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                规划下一段
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--theme-text-muted)]">
                会按当前选择追加{DEFAULT_PLANNING_CONFIG.presets[outlineExtensionSize].label}，只补后续可写窗口，不会一次性展开全书章节。
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[var(--theme-surface-solid)]/[0.03] p-4 shadow-inner ring-1 ring-[var(--theme-border)]">
            <label
              htmlFor="outline-refine-supplement"
              className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]"
            >
              补充内容
            </label>
            <textarea
              id="outline-refine-supplement"
              autoFocus
              value={outlineRefineSupplement}
              disabled={outlineRefineBusy}
              onChange={(event) => setOutlineRefineSupplement(event.target.value)}
              placeholder="例如：下一段补强商战线、增加女主主动推进、保留当前已写章节情绪，不要改前文..."
              className="min-h-[180px] w-full resize-none rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 text-sm font-bold leading-relaxed text-[var(--theme-text-secondary)] outline-none shadow-sm transition-all placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:ring-4 focus:ring-[var(--theme-brand-border)] disabled:cursor-wait disabled:opacity-70"
              maxLength={1200}
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-[var(--theme-text-muted)]">
              <span className="line-clamp-1">留空也可以直接按当前作品信息规划下一段。</span>
              <span className="tabular-nums">{outlineRefineSupplement.length}/1200</span>
            </div>
          </div>

          {outlineRefineError ? (
            <div className="mt-4 rounded-2xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-4 py-3 text-sm font-bold leading-[1.7] text-[var(--theme-danger-text)]">
              {outlineRefineError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={outlineRefineBusy}
              onClick={() => setOutlineRefineConfirmOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 text-sm font-semibold text-[var(--theme-text-secondary)] shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-[var(--theme-surface-solid)] active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!work || outlineRefineBusy}
              onClick={() => void handleRefineOutline(outlineRefineSupplement)}
              className="theme-brand-gradient-bg inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white shadow-lg shadow-[var(--theme-brand-500)]/25 transition-all hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl hover:shadow-[var(--theme-brand-500)]/25 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
            >
              <Wand2 className={outlineRefineBusy ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              <span>{outlineRefineBusy ? "正在规划..." : "确认规划"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

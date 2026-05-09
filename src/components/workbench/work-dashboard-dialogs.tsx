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
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[7vh] sm:pt-[10vh]">
      <button
        type="button"
        aria-label="关闭章节切换"
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={() => {
          setCommandOpen(false);
          setCommandQuery("");
        }}
      />

      <div className="relative flex max-h-[82vh] w-full max-w-4xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface-solid)]">
        <div className="grid gap-4 border-b border-[var(--theme-border)]/50 bg-white/50 p-6 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--theme-border)] bg-white/80 px-5 py-4 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/20 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
            <Search className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium tracking-tight text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
              placeholder="搜索章节名、卷号或关键字..."
            />
            <kbd className="hidden rounded-xl border border-[var(--theme-border)] bg-zinc-50/80 px-2.5 py-1 font-mono text-[11px] font-bold tracking-widest text-zinc-500 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-400 sm:block">
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
            className="inline-flex h-[60px] items-center justify-center gap-3 rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-lg shadow-zinc-950/20 transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:bg-zinc-200"
          >
            <PenLine className="h-5 w-5" />
            <span>继续写作：{formatChapterLabel(nextChapterIndex)}</span>
          </button>
        </div>

        <div className="border-b border-[var(--theme-border)]/50 px-6 py-5 dark:border-[var(--theme-border)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Chapter Navigator
              </p>
              <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                {commandQuery.trim() ? "匹配章节" : "章节列表"}
                {work?.title ? ` · ${work.title}` : ""}
              </h3>
            </div>
            <span className="rounded-xl border border-[var(--theme-border)] bg-zinc-50/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-400">
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
                      ? "mb-2 flex min-h-[72px] w-full cursor-pointer items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-left shadow-sm ring-1 ring-emerald-200/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                      : "group mb-2 flex min-h-[72px] w-full cursor-pointer items-center justify-between rounded-2xl border border-transparent px-5 py-4 text-left transition-all hover:border-[var(--theme-border)] hover:bg-white/80 hover:shadow-sm dark:hover:border-[var(--theme-border)] dark:hover:bg-zinc-950/80"
                  }
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={
                        active
                          ? "flex h-12 min-w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-zinc-950"
                          : "flex h-12 min-w-20 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white/80 px-3 text-xs font-bold text-zinc-500 shadow-sm transition-all group-hover:border-[var(--theme-border)] group-hover:text-zinc-950 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-300 dark:group-hover:border-[var(--theme-border)] dark:group-hover:text-white"
                      }
                    >
                      {formatChapterLabel(chapter.index)}
                    </div>
                    <span
                      className={
                        active
                          ? "truncate text-base font-bold text-zinc-950 dark:text-emerald-100"
                          : "truncate text-sm font-bold text-zinc-700 transition-colors group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white"
                      }
                    >
                      {formatChapterDisplayTitle(chapter)}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    {active ? (
                      <>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          {nextChapterExists ? "继续写作" : "下一章"}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] dark:bg-emerald-400" />
                      </>
                    ) : (
                      <span
                        className={
                          recent
                            ? "rounded-lg border border-purple-200/80 bg-purple-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-700 shadow-sm dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300"
                            : edited
                              ? "rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "rounded-lg border border-[var(--theme-border)] bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-400"
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
            <div className="px-4 py-12 text-center text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              没有匹配的章节。
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--theme-border)]/50 bg-zinc-50/50 px-6 py-4 text-xs font-bold text-zinc-500 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 dark:text-zinc-400">
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭规划下一段确认"
        disabled={outlineRefineBusy}
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm transition-opacity disabled:cursor-wait"
        onClick={() => setOutlineRefineConfirmOpen(false)}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface-solid)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/10" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-purple-400/15 blur-3xl dark:bg-purple-400/10" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/10 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
              <Edit3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                渐进规划
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                规划下一段
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-300">
                会按当前选择追加{DEFAULT_PLANNING_CONFIG.presets[outlineExtensionSize].label}，只补后续可写窗口，不会一次性展开全书章节。
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-zinc-950/[0.03] p-4 shadow-inner ring-1 ring-[var(--theme-border)] dark:bg-white/[0.04] dark:ring-[var(--theme-border)]">
            <label
              htmlFor="outline-refine-supplement"
              className="mb-3 block text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
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
              className="min-h-[180px] w-full resize-none rounded-2xl border border-[var(--theme-border)] bg-white/80 p-4 text-sm font-bold leading-relaxed text-zinc-700 outline-none shadow-sm transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
              maxLength={1200}
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <span className="line-clamp-1">留空也可以直接按当前作品信息规划下一段。</span>
              <span className="tabular-nums">{outlineRefineSupplement.length}/1200</span>
            </div>
          </div>

          {outlineRefineError ? (
            <div className="mt-4 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm font-bold leading-[1.7] text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
              {outlineRefineError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={outlineRefineBusy}
              onClick={() => setOutlineRefineConfirmOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-white/70 px-6 text-sm font-semibold text-zinc-600 shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.07]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!work || outlineRefineBusy}
              onClick={() => void handleRefineOutline(outlineRefineSupplement)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/25 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
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

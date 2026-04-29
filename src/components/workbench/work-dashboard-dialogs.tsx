import { Edit3, PenLine, Search, Wand2 } from "lucide-react";

import {
  formatChapterDisplayTitle,
  formatChapterLabel,
} from "@/lib/workbench/work-dashboard-format";
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
        className="absolute inset-0 cursor-pointer bg-slate-950/35 backdrop-blur-md transition-opacity"
        onClick={() => {
          setCommandOpen(false);
          setCommandQuery("");
        }}
      />

      <div className="relative flex max-h-[82vh] w-full max-w-3xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 border-b border-slate-200 bg-[#fbfcf8] p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              placeholder="搜索章节名、卷号或关键字..."
            />
            <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:block">
              Esc
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <PenLine className="h-4 w-4" />
            继续写作：{formatChapterLabel(nextChapterIndex)}
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                Chapter Navigator
              </p>
              <h3 className="mt-1 text-sm font-black text-slate-950 dark:text-white">
              {commandQuery.trim() ? "匹配章节" : "章节列表"}
                {work?.title ? ` · ${work.title}` : ""}
              </h3>
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              点击章节打开
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      ? "mb-1 flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10"
                      : "group mb-1 flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-4 py-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900"
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={
                        active
                          ? "flex h-10 min-w-16 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-black text-white dark:bg-white dark:text-slate-950"
                          : "flex h-10 min-w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition-colors group-hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:group-hover:text-white"
                      }
                    >
                      {formatChapterLabel(chapter.index)}
                    </div>
                    <span
                      className={
                        active
                          ? "truncate text-sm font-black text-slate-950 dark:text-emerald-100"
                          : "truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-white"
                      }
                    >
                      {formatChapterDisplayTitle(chapter)}
                    </span>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    {active ? (
                      <>
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-200">
                          {nextChapterExists ? "继续写作" : "下一章"}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
                      </>
                    ) : (
                      <span
                        className={
                          recent
                            ? "rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300"
                            : edited
                              ? "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
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
            <div className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
              没有匹配的章节。
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
          <span>共 {commandChapters.length} 个章节结果</span>
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
        aria-label="关闭重写大纲确认"
        disabled={outlineRefineBusy}
        className="absolute inset-0 cursor-pointer bg-slate-950/35 backdrop-blur-md transition-opacity disabled:cursor-wait"
        onClick={() => setOutlineRefineConfirmOpen(false)}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/90 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/30 dark:ring-white/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-400/10" />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-400/10" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/10 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-300/20">
              <Edit3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                确认重写
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                重写大纲
              </h3>
              <p className="mt-3 text-sm font-medium leading-[1.8] text-slate-500 dark:text-slate-300">
                会按当前选择向后延伸约{outlineExtensionSize}章，并重新规划分卷、章节范围和关键段落。你可以补充本次想强化的方向，再确认执行。
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-slate-950/[0.03] p-4 shadow-inner ring-1 ring-slate-900/5 dark:bg-white/[0.04] dark:ring-white/10">
            <label
              htmlFor="outline-refine-supplement"
              className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
            >
              补充内容
            </label>
            <textarea
              id="outline-refine-supplement"
              autoFocus
              value={outlineRefineSupplement}
              disabled={outlineRefineBusy}
              onChange={(event) => setOutlineRefineSupplement(event.target.value)}
              placeholder="例如：补强商战线、压缩前 20 章节奏、增加女主主动推进、后期多给反派压迫感..."
              className="min-h-[180px] w-full resize-none rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm font-medium leading-[1.9] text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-500"
              maxLength={1200}
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400 dark:text-slate-500">
              <span className="line-clamp-1">留空也可以直接按当前作品信息重写。</span>
              <span className="tabular-nums">{outlineRefineSupplement.length}/1200</span>
            </div>
          </div>

          {outlineRefineError ? (
            <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm font-bold leading-[1.7] text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
              {outlineRefineError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={outlineRefineBusy}
              onClick={() => setOutlineRefineConfirmOpen(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-6 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-900/5 transition-all hover:bg-slate-50 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!work || outlineRefineBusy}
              onClick={() => void handleRefineOutline(outlineRefineSupplement)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/25 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
            >
              <Wand2 className={outlineRefineBusy ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              <span>{outlineRefineBusy ? "正在重写..." : "确认重写"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

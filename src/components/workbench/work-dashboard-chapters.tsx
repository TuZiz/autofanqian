"use client";

import { BookOpen, FileText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatRelativeTime } from "@/lib/dashboard/dashboard-format";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { isShortStoryWork } from "@/shared/work-type";

export function WorkDashboardChaptersPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const isShortStory = isShortStoryWork(dashboard.work?.workType);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "written" | "empty">("all");
  const chapters = useMemo(() => dashboard.chapters ?? [], [dashboard.chapters]);
  const createChapterIndex = Math.max(1, dashboard.maxChapterIndex + 1);
  const canAddChapter =
    Boolean(dashboard.work) &&
    (!dashboard.plannedChapterCount || createChapterIndex <= dashboard.plannedChapterCount) &&
    !dashboard.addChapterBusy;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return chapters.filter((chapter) => {
      if (status === "written" && chapter.wordCount <= 0) return false;
      if (status === "empty" && chapter.wordCount > 0) return false;
      if (!normalized) return true;

      return [
        chapter.index,
        chapter.title ?? "",
        isShortStory ? `场景${chapter.index}` : `第${chapter.index}章`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [chapters, isShortStory, query, status]);

  return (
    <section id="chapters" className="app-compact-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
              {isShortStory ? "场景面板" : "章节面板"}
            </div>
            <h3 className="mt-0.5 text-[1.34rem] font-extrabold tracking-tight text-[var(--theme-text-strong)]">
              {isShortStory ? "短篇正文" : "章节工作台"}
            </h3>
          </div>
        </div>

        <button
          type="button"
          disabled={!canAddChapter}
          title={
            dashboard.addChapterBusy
              ? isShortStory
                ? "正在新增场景..."
                : "正在新增章节..."
              : canAddChapter
                ? isShortStory
                  ? `新增场景 ${createChapterIndex}`
                  : `新增第${createChapterIndex}章`
                : isShortStory
                  ? "短篇场景已全部拆分"
                  : "请先规划下一段后再新增章节"
          }
          onClick={() => void dashboard.handleAddChapter()}
          className="inline-flex h-9.5 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3.5 text-sm font-bold text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_18px_32px_-18px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          {dashboard.addChapterBusy ? "新增中..." : isShortStory ? "新增场景" : "新增章节"}
        </button>
      </div>

      <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-6 text-[var(--theme-text-muted)]">
        {isShortStory
          ? "底层仍以正文文档保存，创作时可按 beats 跳转，但这里以短篇正文为主。"
          : "快速查看全部章节，筛出未写内容，或直接跳转到对应写作页。"}
      </p>

      {dashboard.addChapterError ? (
        <div className="mt-3 rounded-xl border border-red-200/70 bg-red-50/85 px-4 py-3 text-sm font-bold text-red-600 shadow-sm dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          {dashboard.addChapterError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_148px]">
        <label className="group relative block">
          <span className="sr-only">{isShortStory ? "搜索场景" : "搜索章节"}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isShortStory ? "搜索场景标题或序号..." : "搜索章节标题或序号..."}
            className="h-9.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] pl-9 pr-3 text-sm font-bold text-[var(--theme-text-primary)] outline-none shadow-sm transition-all focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-emerald-500/15"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-[var(--theme-brand-600)]" />
        </label>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          aria-label={isShortStory ? "按状态筛选场景" : "按状态筛选章节"}
          className="h-9.5 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-bold text-[var(--theme-text-primary)] outline-none shadow-sm transition-all focus:border-[var(--theme-brand-border)] focus:ring-2 focus:ring-emerald-500/15"
        >
          <option value="all">{isShortStory ? "全部场景" : "全部章节"}</option>
          <option value="written">已写</option>
          <option value="empty">未写</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-inner">
        <div className="max-h-[calc(100dvh-22rem)] overflow-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-[var(--theme-border)] bg-stone-50/95 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)] backdrop-blur dark:bg-stone-950/95">
              <tr>
                <th className="w-[38%] px-4 py-2.5 font-bold">{isShortStory ? "正文段落" : "章节"}</th>
                <th className="w-[15%] px-3 py-2.5 font-bold">状态</th>
                <th className="w-[15%] px-3 py-2.5 font-bold">字数</th>
                <th className="w-[16%] px-3 py-2.5 font-bold">更新</th>
                <th className="w-[16%] px-3 py-2.5 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border)]">
              {filtered.length ? (
                filtered.map((chapter) => (
                  <tr key={chapter.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex h-8 min-w-[62px] shrink-0 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2 text-[11px] font-black text-[var(--theme-text-muted)] shadow-sm">
                          {isShortStory ? (chapter.index === 1 ? "正文" : `Beat ${chapter.index}`) : `第${chapter.index}章`}
                        </span>
                        <span className="truncate text-sm font-bold text-[var(--theme-text-strong)]">
                          {chapter.title || (isShortStory ? "短篇正文" : "未命名章节")}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          chapter.wordCount > 0
                            ? "inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                            : "inline-flex rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)] shadow-sm"
                        }
                      >
                        {chapter.wordCount > 0 ? "已写" : "未写"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[13px] font-bold tabular-nums text-[var(--theme-text-secondary)]">
                      {chapter.wordCount.toLocaleString("zh-CN")} 字
                    </td>
                    <td className="px-3 py-3 text-[11px] font-bold tabular-nums text-[var(--theme-text-muted)]">
                      <span className="line-clamp-1">{formatRelativeTime(chapter.updatedAt)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => dashboard.goToChapter(chapter.index)}
                        className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,250,0.92))] px-3 text-[11px] font-black text-[var(--theme-text-secondary)] shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all hover:-translate-y-0.5 hover:text-[var(--theme-text-strong)] hover:shadow-[0_16px_28px_-18px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.98)] active:scale-[0.98] dark:border-[var(--theme-border)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(18,18,20,0.92))] dark:text-zinc-300"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        打开
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100/80 text-zinc-400 shadow-inner ring-1 ring-[var(--theme-border)] dark:bg-zinc-800/80 dark:text-zinc-500 dark:ring-[var(--theme-border)]">
                      <FileText className="h-6 w-6" />
                    </div>
                    {isShortStory ? "没有匹配的场景" : "没有匹配的章节"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

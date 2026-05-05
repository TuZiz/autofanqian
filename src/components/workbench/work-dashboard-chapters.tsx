"use client";

import { BookOpen, FileText, PenLine, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatRelativeTime } from "@/lib/dashboard/dashboard-format";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

export function WorkDashboardChaptersPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "written" | "empty">("all");
  const chapters = useMemo(() => dashboard.chapters ?? [], [dashboard.chapters]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return chapters.filter((chapter) => {
      if (status === "written" && chapter.wordCount <= 0) return false;
      if (status === "empty" && chapter.wordCount > 0) return false;
      if (!normalized) return true;
      return [
        chapter.index,
        chapter.title ?? "",
        `第 ${chapter.index} 章`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [chapters, query, status]);

  return (
    <section id="chapters" className="rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200/80 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-800/50 dark:bg-blue-500/10 dark:text-blue-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Chapters
            </div>
            <h3 className="mt-1 text-xl font-black text-zinc-950 dark:text-white">章节工作台</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dashboard.goToChapter(dashboard.nextChapterIndex)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <PenLine className="h-4 w-4" />
          继续写作
        </button>
      </div>
      <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
        紧凑查看所有已规划章节，快速过滤未写章节或进入写作页。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="relative block">
          <span className="sr-only">搜索章节</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索章节标题或序号..."
            className="h-12 w-full rounded-xl border border-zinc-200/80 bg-white/80 pl-10 pr-4 text-sm font-bold text-zinc-950 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          aria-label="按状态筛选章节"
          className="h-12 rounded-xl border border-zinc-200/80 bg-white/80 px-4 text-sm font-bold text-zinc-700 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:text-zinc-300 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
        >
          <option value="all">全部章节</option>
          <option value="written">已写</option>
          <option value="empty">未写</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/50 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200/80 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3.5 font-bold">章节</th>
                <th className="px-4 py-3.5 font-bold">状态</th>
                <th className="px-4 py-3.5 font-bold">字数</th>
                <th className="px-4 py-3.5 font-bold">更新</th>
                <th className="px-4 py-3.5 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filtered.length ? (
                filtered.map((chapter) => (
                  <tr key={chapter.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-2.5 text-xs font-bold text-zinc-500 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300">
                          第 {chapter.index} 章
                        </span>
                        <span className="truncate font-black text-zinc-950 dark:text-white">
                          {chapter.title || "未命名章节"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          chapter.wordCount > 0
                            ? "inline-flex rounded-lg border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                            : "inline-flex rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400"
                        }
                      >
                        {chapter.wordCount > 0 ? "已写" : "未写"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {chapter.wordCount.toLocaleString("zh-CN")} 字
                    </td>
                    <td className="px-4 py-4 text-xs font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatRelativeTime(chapter.updatedAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => dashboard.goToChapter(chapter.index)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 text-xs font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-zinc-300 active:scale-[0.98] dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-zinc-700"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        打开
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <FileText className="mx-auto mb-3 h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                    没有匹配的章节
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

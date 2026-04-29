"use client";

import { BookOpen, PenLine, Plus, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

import {
  formatRelativeTime,
  formatWordStat,
} from "@/lib/dashboard/dashboard-format";
import type { DashboardClientController } from "@/lib/dashboard/use-dashboard-client";

type DashboardWorksSectionProps = {
  dashboard: DashboardClientController;
};

export function DashboardWorksSection({ dashboard }: DashboardWorksSectionProps) {
  const { deleteBusy, openDeleteDialog, overview, user } = dashboard;
  const works = overview?.works ?? [];
  const worksTitle = user?.isAdmin ? "全部用户作品" : "我的全部作品";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500 dark:text-zinc-500">
            作品库
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950 dark:text-white">
            {worksTitle}
          </h2>
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-zinc-400">
          共 {works.length} 部
        </div>
      </div>

      {works.length ? (
        <div className="flex flex-wrap gap-3">
          {works.map((work) => {
            const workWords = formatWordStat(work.wordCount);
            const workHref = `/dashboard/work/${work.id}`;
            const chapterHref = `/dashboard/work/${work.id}/chapter/${Math.max(1, work.chapter.index)}`;
            const coverMark = work.title.replace(/[《》]/g, "").trim().slice(0, 1) || "作";
            const chapterText =
              work.chapter.wordCount > 0
                ? `第${work.chapter.index}章：${work.chapter.title || "未命名章节"}`
                : "还没有开始正文";
            const completion = Math.max(0, Math.min(100, work.completionPercent));
            const canDeleteWork = Boolean(user?.isAdmin || work.owner.id === user?.id);

            return (
              <article
                key={work.id}
                className="group relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900 sm:w-[420px]"
              >
                <div className="flex gap-3 p-4">
                  <Link
                    href={workHref}
                    aria-label={`查看作品 ${work.title}`}
                    className="flex h-24 w-16 shrink-0 flex-col justify-between rounded-lg border border-slate-900 bg-slate-950 p-2.5 text-white shadow-sm transition group-hover:-translate-y-0.5 dark:border-white dark:bg-white dark:text-slate-950"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">
                      Work
                    </span>
                    <span className="text-3xl font-black leading-none">{coverMark}</span>
                    <span className="truncate text-[9px] font-semibold opacity-70">
                      {work.genreLabel || work.tag}
                    </span>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="theme-chip inline-flex max-w-[10rem] items-center truncate rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-none">
                        {work.genreLabel || work.tag}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {canDeleteWork ? (
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(work)}
                            disabled={deleteBusy}
                            aria-label={`删除《${work.title}》`}
                            title="删除"
                            className="theme-button-secondary inline-flex h-7 w-7 items-center justify-center rounded-lg p-0 text-[color:var(--theme-text-muted)] shadow-none transition hover:bg-white/70 hover:text-rose-600 hover:[border-color:var(--theme-danger-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        <Link
                          href={chapterHref}
                          className="theme-button-primary inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[11px] font-bold shadow-none active:scale-95"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          继续写作
                        </Link>
                      </div>
                    </div>

                    <Link href={workHref} className="group/title mt-2.5 block">
                      <h3 className="theme-heading line-clamp-2 text-[1rem] font-black leading-snug tracking-normal transition-colors group-hover/title:text-slate-700 dark:group-hover/title:text-slate-200">
                        《{work.title}》
                      </h3>
                    </Link>

                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                      <div className="theme-subheading flex items-center gap-1.5 text-xs font-semibold">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-[color:var(--theme-text-weak)]" />
                        <span className="min-w-0 truncate">{chapterText}</span>
                      </div>
                    </div>

                    {user?.isAdmin ? (
                      <div className="theme-muted mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-[color:var(--theme-text-weak)]" />
                        <span className="min-w-0 truncate">
                          ID {work.owner.code} · {work.owner.email}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="theme-divider grid grid-cols-3 gap-2 border-t px-4 py-2.5 text-[11px]">
                  <MiniMetric label="字数" unit={workWords.unit} value={workWords.value} />
                  <MiniMetric label="章节" unit="章" value={String(work.chapterCount)} />
                  <div>
                    <div className="theme-muted text-[10px] font-semibold">更新</div>
                    <div className="theme-subheading mt-0.5 truncate font-semibold">
                      {formatRelativeTime(work.updatedAt)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="theme-muted flex items-center justify-between text-[11px] font-semibold">
                    <span>完成度</span>
                    <span className="theme-heading">{completion}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--theme-divider)]">
                    <div
                      className="h-full rounded-full bg-slate-950 transition-[width] duration-500 dark:bg-white"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-[0_10px_32px_-22px_rgba(15,23,42,0.16)] dark:border-zinc-700 dark:bg-zinc-900/70">
          <div className="text-lg font-black tracking-normal text-slate-950 dark:text-white">
            暂无作品记录
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-zinc-400">
            创建第一部作品后，这里会显示所有作品、章节、字数和最近更新。
          </p>
          <Link
            href="/dashboard/create"
            className="theme-button-primary mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            新建作品
          </Link>
        </div>
      )}
    </section>
  );
}

function MiniMetric({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <div>
      <div className="theme-muted text-[10px] font-semibold">{label}</div>
      <div className="theme-heading mt-0.5 font-black">
        {value}
        <span className="theme-muted ml-1 text-[11px] font-semibold">{unit}</span>
      </div>
    </div>
  );
}

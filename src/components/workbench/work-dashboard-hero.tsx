"use client";

import { useState } from "react";
import { Check, Compass, Gauge, Loader2, PencilLine, Save, X } from "lucide-react";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

export function WorkDashboardHero({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    error,
    headerChips,
    outline,
    clearWorkTitleError,
    saveWorkTitle,
    work,
    workTitleError,
    workTitleSaving,
  } = dashboard;
  const [titleDraft, setTitleDraft] = useState(work?.title ?? "");
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const overviewText = work ? work.idea : error || "暂无作品脉络信息";
  const shouldCollapseOverview =
    overviewText.length > 280 || overviewText.split(/\r?\n/).length > 4;
  const overviewPreview = shouldCollapseOverview
    ? `${overviewText.replace(/\s+/g, " ").trim().slice(0, 280)}...`
    : overviewText;

  function openTitleDialog() {
    if (!work || workTitleSaving) return;
    clearWorkTitleError();
    setTitleDraft(work.title);
    setTitleDialogOpen(true);
  }

  function closeTitleDialog() {
    if (workTitleSaving) return;
    clearWorkTitleError();
    setTitleDraft(work?.title ?? "");
    setTitleDialogOpen(false);
  }

  async function commitTitle() {
    if (!work) return;

    const nextTitle = titleDraft.trim();
    const saved = await saveWorkTitle(nextTitle);
    if (!saved) {
      setTitleDraft(work.title);
    } else {
      setTitleDraft(nextTitle);
      setTitleDialogOpen(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-8">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-[80px] dark:bg-blue-500/10" />
      
      <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          {headerChips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "inline-flex h-7 items-center rounded-lg border px-2.5 text-[11px] font-bold uppercase tracking-wider",
                chip.tone === "brand"
                  ? "border-blue-200/60 bg-blue-50/80 text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-zinc-200/80 bg-zinc-50/80 text-zinc-600 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-800/50 dark:text-zinc-300",
              )}
            >
              {chip.label}
            </span>
          ))}
          {outline ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-emerald-50/80 px-2.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              大纲已锁定
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Workbench Overview
          </p>
          {work ? (
            <div className="max-w-4xl">
              <div className="flex min-w-0 items-start gap-4">
                <h2 className="font-serif-display min-w-0 flex-1 text-3xl font-black leading-tight text-zinc-950 dark:text-white md:text-4xl">
                  《{work.title}》
                </h2>
                <button
                  type="button"
                  onClick={openTitleDialog}
                  disabled={workTitleSaving}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm ring-1 ring-transparent transition-all hover:bg-zinc-50 hover:text-zinc-900 hover:ring-zinc-300 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-white dark:hover:ring-zinc-700"
                  aria-label="修改书名"
                  title="修改书名"
                >
                  {workTitleSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PencilLine className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-1 min-h-5 text-xs font-bold">
                {workTitleError ? (
                  <span className="text-red-600 dark:text-red-300">{workTitleError}</span>
                ) : (
                  <span className="text-stone-500 dark:text-stone-400">
                    点击右侧按钮，在弹窗中确认修改书名。
                  </span>
                )}
              </div>
            </div>
          ) : (
            <h2 className="max-w-4xl text-2xl font-black leading-tight text-stone-950 dark:text-white md:text-3xl">
              作品加载失败
            </h2>
          )}
          <p
            className={cn(
              "mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300",
              !overviewExpanded && "line-clamp-4",
            )}
          >
            {overviewExpanded ? overviewText : overviewPreview}
          </p>
          {shouldCollapseOverview ? (
            <button
              type="button"
              aria-expanded={overviewExpanded}
              onClick={() => setOverviewExpanded((current) => !current)}
              className="mt-3 inline-flex h-9 items-center rounded-xl border border-zinc-200/80 bg-white px-4 text-xs font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {overviewExpanded ? "收起预览" : "展开概览"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200/60 pt-5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <Compass className="h-4 w-4 text-zinc-500" />
            {work?.platformLabel || work?.platformId || "未指定平台"}
          </span>
          <span className="hidden h-4 w-px bg-zinc-200/60 sm:inline-block dark:bg-zinc-800/60" />
          <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Gauge className="h-4 w-4" />
            创作核心就绪
          </span>
        </div>
      </div>

      {titleDialogOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-title-dialog-title"
        >
          <button
            type="button"
            aria-label="关闭修改书名"
            disabled={workTitleSaving}
            className="absolute inset-0 cursor-pointer bg-zinc-950/40 backdrop-blur-md disabled:cursor-wait"
            onClick={closeTitleDialog}
          />

          <form
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/80 shadow-2xl shadow-zinc-950/20 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/80"
            onSubmit={(event) => {
              event.preventDefault();
              void commitTitle();
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200/50 bg-white/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  Novel Title
                </p>
                <h3
                  id="work-title-dialog-title"
                  className="mt-1 text-2xl font-black text-zinc-950 dark:text-white"
                >
                  修改作品书名
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTitleDialog}
                disabled={workTitleSaving}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <label
                htmlFor="work-title-input"
                className="block text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                书名
              </label>
              <input
                id="work-title-input"
                autoFocus
                value={titleDraft}
                disabled={workTitleSaving}
                onChange={(event) => setTitleDraft(event.target.value.slice(0, 120))}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeTitleDialog();
                  }
                }}
                className="h-14 w-full rounded-xl border border-zinc-300/80 bg-white/80 px-4 text-xl font-black text-zinc-950 outline-none backdrop-blur-sm transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                placeholder="请输入作品书名"
                maxLength={120}
              />
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span
                  className={
                    workTitleError
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {workTitleError || "最多 120 个字符，保存后作品页会立即更新。"}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                  {titleDraft.length}/120
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200/50 bg-zinc-50/50 px-6 py-5 dark:border-zinc-800/50 dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeTitleDialog}
                disabled={workTitleSaving}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200/80 bg-white px-6 text-sm font-bold text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={workTitleSaving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {workTitleSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {workTitleSaving ? "保存中..." : "保存书名"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

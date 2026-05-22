"use client";

import { useState } from "react";
import { Check, Compass, Download, FileText, Gauge, Loader2, PencilLine, Save, Sparkles, WandSparkles, X } from "lucide-react";

import { ExportDownloadButton } from "@/components/workbench/export-download-button";
import { ShortStoryOutlineView } from "@/components/workbench/short-story-outline-view";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { buildShortStoryOutlineViewModel } from "@/lib/workbench/short-story-outline-view-model";
import { cn } from "@/lib/utils";
import { isShortStoryWork } from "@/shared/work-type";

export function WorkDashboardHero({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    chapters,
    error,
    headerChips,
    outline,
    plannedChapterCount,
    progressPercent,
    targetChapterCount,
    clearWorkTitleError,
    saveWorkTitle,
    work,
    workTitleError,
    workTitleSaving,
  } = dashboard;
  const [titleDraft, setTitleDraft] = useState(work?.title ?? "");
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const creativeText = work?.idea?.trim() ?? "";
  const synopsisText = (work?.synopsis || outline?.synopsis || "").trim();
  const mergedOverviewText = [creativeText, synopsisText].filter(Boolean).join("\n\n");
  const displayOverviewText = mergedOverviewText || error || "暂无作品脉络信息";
  const shouldCollapseOverview =
    displayOverviewText.length > 320 || displayOverviewText.split(/\r?\n/).length > 6;
  const writtenChapterCount = chapters.filter((chapter) => chapter.wordCount > 0).length;
  const tagSummary = work?.tags?.slice(0, 5).join("、");
  const isShortStory = isShortStoryWork(work?.workType);
  const shortOutline = isShortStory
    ? buildShortStoryOutlineViewModel(work?.outline ?? outline, work?.rawOutline)
    : null;
  const firstReadableChapter = chapters.find((chapter) => chapter.wordCount > 0) ?? chapters[0] ?? null;
  const shortBodyIndex = firstReadableChapter?.index ?? 1;
  const shortWordCount = chapters.reduce((sum, chapter) => sum + Math.max(0, chapter.wordCount), 0);

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
      return;
    }

    setTitleDraft(nextTitle);
    setTitleDialogOpen(false);
  }

  return (
    <section className="app-compact-panel relative flex flex-col overflow-hidden p-3.5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[rgba(236,245,234,0.42)] blur-[72px] dark:bg-emerald-500/8" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {headerChips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-bold tracking-wide",
                chip.tone === "brand"
                  ? "border-[rgba(16,185,129,0.14)] bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(246,249,244,0.92))] text-emerald-700 shadow-[0_10px_22px_-18px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-[var(--theme-border)] bg-zinc-50/90 text-zinc-600 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-400",
              )}
            >
              {chip.label}
            </span>
          ))}
          {outline ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[rgba(16,185,129,0.14)] bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(246,249,244,0.92))] px-3 text-[11px] font-bold tracking-wide text-emerald-700 shadow-[0_10px_22px_-18px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              {isShortStory ? "短篇结构已锁定" : "大纲已锁定"}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
            作品总览
          </p>

          {work ? (
            <div className="mt-1 max-w-[56rem]">
              <div className="flex min-w-0 items-start gap-2.5">
                <h2 className="min-w-0 flex-1 text-[1.42rem] font-extrabold leading-[1.03] tracking-tight text-[var(--theme-text-strong)] sm:text-[1.68rem] xl:text-[1.84rem] 2xl:text-[1.96rem]">
                  <span className="line-clamp-2 break-words">{work.title}</span>
                </h2>
                <button
                  type="button"
                  onClick={openTitleDialog}
                  disabled={workTitleSaving}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,250,0.92))] text-zinc-600 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all hover:-translate-y-0.5 hover:text-zinc-950 hover:shadow-[0_18px_30px_-18px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.98)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(18,18,20,0.92))] dark:text-zinc-300 dark:shadow-[0_12px_24px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] dark:hover:text-white"
                  aria-label="修改书名"
                  title="修改书名"
                >
                  {workTitleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-1 min-h-[18px] text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400">
                {workTitleError ? <span className="text-red-600 dark:text-red-400">{workTitleError}</span> : "点击右侧按钮修改书名。"}
              </div>
            </div>
          ) : (
            <h2 className="mt-2 max-w-4xl text-2xl font-extrabold leading-tight text-zinc-950 dark:text-white md:text-3xl">
              作品加载失败
            </h2>
          )}

          <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-[rgba(16,185,129,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(249,247,242,0.965))] shadow-[0_20px_42px_-32px_rgba(148,163,184,0.24),0_10px_26px_-22px_rgba(16,185,129,0.08),inset_0_1px_0_rgba(255,255,255,0.98)] dark:border-[rgba(255,255,255,0.06)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(20,20,22,0.95))] dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(16,185,129,0.09)] px-4 py-3 dark:border-[rgba(255,255,255,0.06)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(16,185,129,0.14)] bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(246,249,244,0.92))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 shadow-[0_10px_22px_-18px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.96)] dark:bg-emerald-500/12 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                创意简介
              </span>
              {tagSummary ? (
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">标签：{tagSummary}</span>
              ) : null}
            </div>
            <div className="px-4 py-3.5">
              <p
                className={cn(
                  "w-full whitespace-pre-wrap text-[13px] font-medium leading-[1.9] text-[var(--theme-text-secondary)]",
                  !overviewExpanded && "line-clamp-[14]",
                )}
              >
                {displayOverviewText}
              </p>
            </div>
          </div>

          {shouldCollapseOverview ? (
            <button
              type="button"
              aria-expanded={overviewExpanded}
              onClick={() => setOverviewExpanded((current) => !current)}
              className="mt-2.5 inline-flex h-9 items-center rounded-full border border-[rgba(16,24,40,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,239,0.94))] px-4 text-[10.5px] font-black uppercase tracking-[0.22em] text-[var(--theme-text-secondary)] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all hover:-translate-y-0.5 hover:text-[var(--theme-text-strong)] hover:shadow-[0_16px_30px_-18px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.98)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/12 active:scale-[0.98] dark:border-[rgba(255,255,255,0.08)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(20,20,22,0.92))] dark:text-zinc-300 dark:shadow-[0_12px_24px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              {overviewExpanded ? "收起简介" : "展开简介"}
            </button>
          ) : null}

          {isShortStory && work ? (
            <div className="mt-3 rounded-[1.3rem] border border-emerald-200/70 bg-emerald-50/65 p-3 shadow-[0_14px_28px_-24px_rgba(16,185,129,0.32)] dark:border-emerald-500/25 dark:bg-emerald-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/25">
                    <Check className="h-3.5 w-3.5" />
                    短篇已生成
                  </div>
                  <h3 className="mt-2 text-lg font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                    这是一篇完结短篇，可直接阅读、润色或导出投稿稿件。
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--theme-text-secondary)]">
                    正文 {shortWordCount.toLocaleString("zh-CN")} 字 · {shortOutline?.beats.length ?? 0} 个 beats · 结局 {shortOutline?.endingLabel ?? "未指定"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => dashboard.goToChapter(shortBodyIndex)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950"
                  >
                    <FileText className="h-4 w-4" />
                    阅读正文
                  </button>
                  <button
                    type="button"
                    onClick={() => dashboard.goToChapter(shortBodyIndex)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98] dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    <WandSparkles className="h-4 w-4" />
                    继续润色
                  </button>
                  <ExportDownloadButton
                    workId={work.id}
                    scope="short_story"
                    format="txt"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-white/90 px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:bg-white hover:text-[var(--theme-text-strong)]"
                    title="导出短篇 TXT"
                  >
                    <Download className="h-3.5 w-3.5" />
                    TXT
                  </ExportDownloadButton>
                  <ExportDownloadButton
                    workId={work.id}
                    scope="short_story"
                    format="md"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-white/90 px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:bg-white hover:text-[var(--theme-text-strong)]"
                    title="导出短篇 Markdown"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Markdown
                  </ExportDownloadButton>
                  <ExportDownloadButton
                    workId={work.id}
                    scope="short_story"
                    format="docx"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-white/90 px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:bg-white hover:text-[var(--theme-text-strong)]"
                    title="导出短篇 DOCX"
                  >
                    <Download className="h-3.5 w-3.5" />
                    DOCX
                  </ExportDownloadButton>
                  <button
                    type="button"
                    onClick={() => window.location.assign("/dashboard")}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white/90 px-3 text-xs font-bold text-[var(--theme-text-secondary)] shadow-sm transition hover:bg-white hover:text-[var(--theme-text-strong)]"
                  >
                    返回作品库
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isShortStory ? (
            <div className="mt-3">
              <ShortStoryOutlineView
                compact
                outline={work?.outline ?? outline}
                rawOutline={work?.rawOutline}
                onOpenBeat={(index) => dashboard.goToChapter(index)}
              />
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2 min-[1200px]:hidden">
            <HeroMetricCard label="总进度" value={`${progressPercent || 0}%`} tone="brand" />
            <HeroMetricCard label={isShortStory ? "正文" : "已写章节"} value={`${writtenChapterCount} ${isShortStory ? "篇" : "章"}`} />
            <HeroMetricCard label={isShortStory ? "Beats" : "已规划"} value={`${isShortStory ? shortOutline?.beats.length ?? 0 : plannedChapterCount || chapters.length} ${isShortStory ? "个" : "章"}`} />
            <HeroMetricCard label="角色档案" value={`${isShortStory ? shortOutline?.characters.length ?? 0 : outline?.characters.length ?? 0} 人`} />
            <HeroMetricCard label={isShortStory ? "目标字数" : "长期目标"} value={isShortStory ? `${shortOutline?.targetWords?.toLocaleString("zh-CN") ?? 0} 字` : `${targetChapterCount || 0} 章`} />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--theme-divider)] pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
          <span className="inline-flex items-center gap-2">
            <Compass className="h-4 w-4 text-zinc-400" />
            {work?.platformLabel || work?.platformId || "未指定平台"}
          </span>
          <span className="hidden h-4 w-px bg-zinc-200/80 sm:inline-block dark:bg-zinc-800/80" />
          <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
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
            className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm disabled:cursor-wait"
            onClick={closeTitleDialog}
          />

          <form
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface-solid)]"
            onSubmit={(event) => {
              event.preventDefault();
              void commitTitle();
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-white/50 px-8 py-6 dark:border-[var(--theme-border)] dark:bg-zinc-950/50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  作品书名
                </p>
                <h3
                  id="work-title-dialog-title"
                  className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
                >
                  修改作品书名
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTitleDialog}
                disabled={workTitleSaving}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-8 py-8">
              <label
                htmlFor="work-title-input"
                className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
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
                className="h-14 w-full rounded-2xl border border-[var(--theme-border)] bg-white/80 px-5 text-xl font-medium text-zinc-950 shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-wait disabled:opacity-70 dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20"
                placeholder="请输入作品书名"
                maxLength={120}
              />
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-wider">
                <span className={workTitleError ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}>
                  {workTitleError || "最多 120 个字符，保存后作品页会立刻更新。"}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                  {titleDraft.length}/120
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)] bg-zinc-50/50 px-8 py-6 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeTitleDialog}
                disabled={workTitleSaving}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-white px-6 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={workTitleSaving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                {workTitleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {workTitleSaving ? "保存中..." : "保存书名"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function HeroMetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "brand";
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.1rem] border px-3.5 py-3 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.92)]",
        tone === "brand"
          ? "border-[rgba(16,185,129,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.94))] shadow-[0_16px_30px_-22px_rgba(16,185,129,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] dark:bg-[linear-gradient(180deg,rgba(24,30,27,0.96),rgba(18,22,20,0.92))]"
          : "border-[var(--theme-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(18,18,20,0.9))]",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-[1.55rem] font-extrabold tracking-tight text-[var(--theme-text-strong)]",
          tone === "brand" && "text-[var(--theme-brand-text)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

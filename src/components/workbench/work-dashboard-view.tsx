"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Bot, PenLine, ScrollText, Sparkles } from "lucide-react";

import { AppShell, MobileBottomNav, StatusBadge } from "@/components/design-system";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { getShortStoryOutlineCount } from "@/lib/workbench/short-story-outline-view-model";
import { cn } from "@/lib/utils";

import { WorkCharactersPanel } from "./work-dashboard-characters";
import { WorkDashboardContextPanel } from "./work-dashboard-context";
import { WorkDashboardChaptersPanel } from "./work-dashboard-chapters";
import { OutlineRefineDialog, WorkChapterCommandDialog } from "./work-dashboard-dialogs";
import { WorkDashboardHeader } from "./work-dashboard-header";
import { WorkDashboardHero } from "./work-dashboard-hero";
import { WorkShortStoryOutlinePanel, WorkVolumesPanel } from "./work-dashboard-outline";
import { WorkDashboardSidebar } from "./work-dashboard-sidebar";
import { isShortStoryWork } from "@/shared/work-type";

type WorkDashboardSectionId = "overview" | "chapters" | "outline" | "characters" | "context";

function getWorkDashboardSections(isShortStory: boolean): Array<{
  id: WorkDashboardSectionId;
  label: string;
  getValue: (dashboard: WorkDashboardController) => string;
}> {
  return [
  {
    id: "overview",
    label: "总览",
    getValue: (dashboard) => (dashboard.progressPercent ? `${dashboard.progressPercent}%` : "0%"),
  },
  {
    id: "chapters",
    label: isShortStory ? "正文" : "章节",
    getValue: (dashboard) => `${dashboard.chapters.length}`,
  },
  {
    id: "outline",
    label: isShortStory ? "结构" : "卷纲",
    getValue: (dashboard) =>
      isShortStory
        ? `${getShortStoryOutlineCount(dashboard.work?.outline ?? dashboard.outline, dashboard.work?.rawOutline).beats}`
        : dashboard.outline && "volumes" in dashboard.outline && dashboard.outline.volumes.length
          ? `${dashboard.outline.volumes.length}`
          : "0",
  },
  {
    id: "characters",
    label: "人物",
    getValue: (dashboard) =>
      isShortStory
        ? `${getShortStoryOutlineCount(dashboard.work?.outline ?? dashboard.outline, dashboard.work?.rawOutline).characters}`
        : dashboard.outline?.characters.length ? `${dashboard.outline.characters.length}` : "0",
  },
  {
    id: "context",
    label: isShortStory ? "设定" : "伏笔设定",
    getValue: (dashboard) => (dashboard.work ? "3类" : "0"),
  },
  ];
}

function isWorkDashboardSectionId(value: string): value is WorkDashboardSectionId {
  return ["overview", "chapters", "outline", "characters", "context"].includes(value);
}

export function WorkDashboardView({ dashboard }: { dashboard: WorkDashboardController }) {
  const [activeSection, setActiveSection] = useState<WorkDashboardSectionId>("overview");
  const isShortStory = isShortStoryWork(dashboard.work?.workType);
  const sections = useMemo(() => getWorkDashboardSections(isShortStory), [isShortStory]);
  const showOverviewCockpit = activeSection === "overview";

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (isWorkDashboardSectionId(hash)) {
        setActiveSection(hash);
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const activePanel = useMemo(() => {
    switch (activeSection) {
      case "chapters":
        return <WorkDashboardChaptersPanel dashboard={dashboard} />;
      case "outline":
        return isShortStory ? (
          <WorkShortStoryOutlinePanel dashboard={dashboard} />
        ) : (
          <WorkVolumesPanel dashboard={dashboard} />
        );
      case "characters":
        return <WorkCharactersPanel dashboard={dashboard} />;
      case "context":
        return <WorkDashboardContextPanel dashboard={dashboard} />;
      case "overview":
      default:
        return <WorkDashboardHero key={dashboard.work?.id ?? "empty"} dashboard={dashboard} />;
    }
  }, [activeSection, dashboard, isShortStory]);

  function handleSectionChange(sectionId: WorkDashboardSectionId) {
    setActiveSection(sectionId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${sectionId}`);
    }
  }

  return (
    <AppShell
      actions={
        <WorkDashboardHeader dashboard={dashboard} />
      }
      maxWidthClassName="max-w-[1520px]"
      mobileNav={<MobileBottomNav activeHref="/dashboard" />}
    >
      <div
        className={cn(
          "grid gap-3.5 min-[1040px]:items-start",
          "min-[1040px]:grid-cols-[196px_minmax(0,1fr)] min-[1240px]:grid-cols-[196px_minmax(0,1fr)_292px] min-[1420px]:grid-cols-[204px_minmax(0,1fr)_304px]",
        )}
      >
        <WorkSectionNav
          activeSection={activeSection}
          dashboard={dashboard}
          sections={sections}
          onSectionChange={handleSectionChange}
        />

        <div className="min-w-0 space-y-4">
          {showOverviewCockpit ? <WorkCockpitHero dashboard={dashboard} onSectionChange={handleSectionChange} /> : null}
          <div id={activeSection}>{activePanel}</div>

          <WorkDashboardSidebar className="min-[1240px]:hidden" dashboard={dashboard} />
        </div>

        <WorkDashboardSidebar className="hidden min-[1240px]:block" dashboard={dashboard} />
      </div>

      <WorkChapterCommandDialog dashboard={dashboard} />
      <OutlineRefineDialog dashboard={dashboard} />
    </AppShell>
  );
}

function WorkCockpitHero({
  dashboard,
  onSectionChange,
}: {
  dashboard: WorkDashboardController;
  onSectionChange: (sectionId: WorkDashboardSectionId) => void;
}) {
  const isShortStory = isShortStoryWork(dashboard.work?.workType);
  const work = dashboard.work;
  const writtenChapterCount = dashboard.chapters.filter((chapter) => chapter.wordCount > 0).length;
  const progress = Math.max(0, Math.min(100, dashboard.progressPercent || 0));
  const nextLabel = isShortStory ? `场景 ${dashboard.nextChapterIndex}` : `第${dashboard.nextChapterIndex}章`;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-[var(--theme-shadow-card)]">
      <div className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="ai">{isShortStory ? "短篇驾驶舱" : "作品驾驶舱"}</StatusBadge>
            {work?.genreLabel || work?.genreId ? (
              <StatusBadge>{work.genreLabel || work.genreId}</StatusBadge>
            ) : null}
            {work?.words ? <StatusBadge>目标 {work.words}</StatusBadge> : null}
          </div>

          <h1 className="mt-3 line-clamp-2 text-3xl font-black tracking-tight text-[var(--theme-text-strong)] sm:text-4xl">
            {work?.title || "未命名作品"}
          </h1>
          <p className="mt-2 line-clamp-3 max-w-4xl text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
            {work?.synopsis || work?.idea || "作品设定和简介会在这里形成稳定的创作方向。"}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dashboard.goToChapter(dashboard.nextChapterIndex)}
              className="theme-brand-gradient-bg inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-white shadow-[var(--theme-shadow-button)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
            >
              <PenLine className="h-4 w-4" />
              继续写作
              <span className="text-xs opacity-85">{nextLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => onSectionChange("chapters")}
              className="theme-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black"
            >
              <BookOpen className="h-4 w-4" />
              章节
            </button>
            <button
              type="button"
              onClick={() => onSectionChange("outline")}
              className="theme-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black"
            >
              <ScrollText className="h-4 w-4" />
              {isShortStory ? "结构" : "卷纲"}
            </button>
            <button
              type="button"
              onClick={() => onSectionChange("context")}
              className="theme-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black"
            >
              <Sparkles className="h-4 w-4" />
              故事圣经
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
                写作进度
              </p>
              <div className="mt-1 text-4xl font-black tabular-nums text-[var(--theme-text-strong)]">
                {progress}%
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-600)] ring-1 ring-[var(--theme-brand-border)]">
              <Bot className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-surface-overlay)]">
            <div
              className="theme-brand-gradient-bg h-full rounded-full transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroStat label={isShortStory ? "正文" : "已写"} value={`${writtenChapterCount}`} />
            <HeroStat label="规划" value={`${dashboard.plannedChapterCount || dashboard.chapters.length}`} />
            <HeroStat label="目标" value={`${dashboard.targetChapterCount || 0}`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--theme-surface-overlay)] px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-black tabular-nums text-[var(--theme-text-strong)]">
        {value}
      </div>
    </div>
  );
}

function WorkSectionNav({
  activeSection,
  dashboard,
  sections,
  onSectionChange,
}: {
  activeSection: WorkDashboardSectionId;
  dashboard: WorkDashboardController;
  sections: ReturnType<typeof getWorkDashboardSections>;
  onSectionChange: (sectionId: WorkDashboardSectionId) => void;
}) {
  return (
    <aside className="min-[1040px]:sticky min-[1040px]:top-16">
      <section className="app-compact-panel p-2.5">
        <div className="mb-2 border-b border-[var(--theme-divider)] pb-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
            作品模块
          </div>
          <h2 className="mt-1 truncate text-[13px] font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            {dashboard.work?.title || "作品管理"}
          </h2>
        </div>

        <nav className="flex flex-col gap-2">
          {sections.map((item) => {
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                aria-pressed={isActive}
                className={cn(
                  "group relative grid min-h-10 w-full grid-cols-[1fr_auto] items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-left text-[13px] font-bold transition-all",
                  isActive
                    ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-text-strong)] shadow-[var(--theme-shadow-button)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-button)] hover:-translate-y-0.5 hover:border-[var(--theme-brand-border)] hover:text-[var(--theme-text-strong)] hover:shadow-[var(--theme-shadow-card)]",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-1 rounded-r-full transition-opacity/60",
                    isActive ? "bg-[var(--theme-brand-500)]/80 opacity-100" : "bg-[var(--theme-brand-500)]/70 opacity-0 group-hover:opacity-100",
                  )}
                />
                <span className="whitespace-nowrap tracking-[0.01em]">{item.label}</span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-black tabular-nums tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                    isActive
                      ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-muted)]",
                  )}
                >
                  {item.getValue(dashboard)}
                </span>
              </button>
            );
          })}
        </nav>
      </section>
    </aside>
  );
}

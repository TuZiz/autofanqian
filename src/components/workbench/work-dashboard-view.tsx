"use client";

import { useEffect, useMemo, useState } from "react";

import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
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
    label: isShortStory ? "场景" : "章节",
    getValue: (dashboard) => `${dashboard.chapters.length}`,
  },
  {
    id: "outline",
    label: isShortStory ? "结构" : "卷纲",
    getValue: (dashboard) =>
      isShortStory
        ? `${dashboard.chapters.length}`
        : dashboard.outline && "volumes" in dashboard.outline && dashboard.outline.volumes.length
          ? `${dashboard.outline.volumes.length}`
          : "0",
  },
  {
    id: "characters",
    label: "人物",
    getValue: (dashboard) => (dashboard.outline?.characters.length ? `${dashboard.outline.characters.length}` : "0"),
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
    <div className="app-work-surface relative min-h-dvh overflow-x-clip font-sans antialiased selection:bg-emerald-100 dark:selection:bg-emerald-500/30">
      <div className="relative z-10 flex min-h-dvh flex-col">
        <WorkDashboardHeader activeSection={activeSection} dashboard={dashboard} onSectionChange={handleSectionChange} />

        <main className="mx-auto w-full max-w-[1496px] flex-1 px-3 pb-4 pt-3 sm:px-4 sm:pb-5 lg:px-4 lg:pb-6 xl:px-5">
          <div className="grid gap-3.5 min-[1040px]:items-start min-[1040px]:grid-cols-[188px_minmax(0,1fr)] min-[1240px]:grid-cols-[188px_minmax(0,1fr)_276px] min-[1420px]:grid-cols-[192px_minmax(0,1fr)_284px]">
            <WorkSectionNav
              activeSection={activeSection}
              dashboard={dashboard}
              sections={sections}
              onSectionChange={handleSectionChange}
            />

            <div className="min-w-0 space-y-4">
              <div id={activeSection}>
                {activePanel}
              </div>

              <WorkDashboardSidebar className="min-[1240px]:hidden" dashboard={dashboard} />
            </div>

            <WorkDashboardSidebar className="hidden min-[1240px]:block" dashboard={dashboard} />
          </div>
        </main>
      </div>

      <WorkChapterCommandDialog dashboard={dashboard} />
      <OutlineRefineDialog dashboard={dashboard} />
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
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
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
                    ? "border-emerald-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,250,247,0.95))] text-[var(--theme-text-strong)] shadow-[0_16px_30px_-20px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-emerald-500/30 dark:bg-[linear-gradient(180deg,rgba(24,28,26,0.96),rgba(17,19,18,0.92))]"
                    : "border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,251,0.92))] text-[var(--theme-text-secondary)] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.92)] hover:-translate-y-0.5 hover:border-emerald-200/80 hover:text-[var(--theme-text-strong)] hover:shadow-[0_16px_30px_-20px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.96)] dark:border-[var(--theme-border)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(17,17,19,0.92))] dark:shadow-[0_10px_24px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-1 rounded-r-full transition-opacity dark:bg-emerald-500/60",
                    isActive ? "bg-emerald-400/80 opacity-100" : "bg-emerald-400/70 opacity-0 group-hover:opacity-100",
                  )}
                />
                <span className="whitespace-nowrap tracking-[0.01em]">{item.label}</span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-black tabular-nums tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-[var(--theme-border)] dark:bg-zinc-900/90",
                    isActive
                      ? "border-emerald-200/80 bg-[rgba(16,185,129,0.08)] text-[var(--theme-brand-text)]"
                      : "border-zinc-200/80 bg-white/90 text-[var(--theme-text-muted)]",
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

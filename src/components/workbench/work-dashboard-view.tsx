import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

import { WorkCharactersPanel } from "./work-dashboard-characters";
import { WorkDashboardContextPanel } from "./work-dashboard-context";
import { WorkDashboardChaptersPanel } from "./work-dashboard-chapters";
import { OutlineRefineDialog, WorkChapterCommandDialog } from "./work-dashboard-dialogs";
import { WorkDashboardHeader } from "./work-dashboard-header";
import { WorkDashboardHero } from "./work-dashboard-hero";
import { WorkSynopsisCard, WorkVolumesPanel } from "./work-dashboard-outline";
import { WorkDashboardSidebar } from "./work-dashboard-sidebar";

export function WorkDashboardView({ dashboard }: { dashboard: WorkDashboardController }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-blue-100 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 app-noise opacity-[0.02] dark:opacity-[0.03]" />
      
      {/* Immersive glow background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-500/10" />
        <div className="absolute top-[20%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-400/10 blur-[120px] dark:bg-purple-500/10" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <WorkDashboardHeader dashboard={dashboard} />

        <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          <div className="grid gap-6 min-[1160px]:grid-cols-[220px_minmax(0,1fr)] min-[1160px]:items-start min-[1520px]:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_340px] min-[1760px]:grid-cols-[240px_minmax(0,1fr)_380px]">
            <WorkSectionNav dashboard={dashboard} />

            <div className="min-w-0 space-y-6">
              <div id="overview">
                <WorkDashboardHero key={dashboard.work?.id ?? "empty"} dashboard={dashboard} />
              </div>
              <WorkDashboardSidebar className="flex min-[1520px]:hidden" dashboard={dashboard} />
              
              <div id="synopsis">
                <WorkSynopsisCard dashboard={dashboard} />
              </div>
              
              <div id="chapters">
                <WorkDashboardChaptersPanel dashboard={dashboard} />
              </div>
              
              <div id="outline">
                <WorkVolumesPanel dashboard={dashboard} />
              </div>
              
              <div id="characters">
                <WorkCharactersPanel dashboard={dashboard} />
              </div>
              
              <div id="context">
                <WorkDashboardContextPanel dashboard={dashboard} />
              </div>
            </div>

            <WorkDashboardSidebar className="hidden min-[1520px]:block" dashboard={dashboard} />
          </div>
        </main>
      </div>

      <WorkChapterCommandDialog dashboard={dashboard} />
      <OutlineRefineDialog dashboard={dashboard} />
    </div>
  );
}

function WorkSectionNav({ dashboard }: { dashboard: WorkDashboardController }) {
  const items = [
    { href: "#overview", label: "总览", value: dashboard.progressPercent ? `${dashboard.progressPercent}%` : "0%" },
    { href: "#chapters", label: "章节", value: `${dashboard.chapters.length}` },
    { href: "#outline", label: "卷纲", value: dashboard.outline?.volumes.length ? `${dashboard.outline.volumes.length}` : "0" },
    { href: "#characters", label: "人物", value: dashboard.outline?.characters.length ? `${dashboard.outline.characters.length}` : "0" },
    { href: "#context", label: "伏笔设定", value: dashboard.work ? "3类" : "0" },
  ];

  return (
    <aside className="min-[1160px]:sticky min-[1160px]:top-24">
      <section className="rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10">
        <div className="mb-5 border-b border-zinc-200/50 pb-5 dark:border-zinc-800/50">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            作品模块
          </div>
          <h2 className="mt-2 truncate text-lg font-black tracking-tight text-zinc-950 dark:text-white">
            {dashboard.work?.title || "作品管理"}
          </h2>
        </div>
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex min-h-[48px] items-center justify-between gap-3 rounded-[16px] px-4 py-2 text-sm font-bold text-zinc-600 transition-all hover:bg-white hover:text-zinc-950 hover:shadow-sm hover:ring-1 hover:ring-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-white dark:hover:ring-zinc-700/80"
            >
              <span>{item.label}</span>
              <span className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-2 py-1 text-[11px] font-bold tracking-widest text-zinc-500 shadow-sm transition-colors group-hover:border-zinc-300/80 group-hover:bg-zinc-100/80 group-hover:text-zinc-700 dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400 dark:group-hover:border-zinc-600/80 dark:group-hover:bg-zinc-800/80 dark:group-hover:text-zinc-300">
                {item.value}
              </span>
            </a>
          ))}
        </nav>
        <div className="mt-5 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 text-[13px] font-bold leading-relaxed text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          伏笔、设定、时间线都已接入，点击条目可在右侧抽屉直接修正。
        </div>
      </section>
    </aside>
  );
}

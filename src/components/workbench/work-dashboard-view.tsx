import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";

import { WorkCharactersPanel } from "./work-dashboard-characters";
import { OutlineRefineDialog, WorkChapterCommandDialog } from "./work-dashboard-dialogs";
import { WorkDashboardHeader } from "./work-dashboard-header";
import { WorkDashboardHero } from "./work-dashboard-hero";
import { WorkSynopsisCard, WorkVolumesPanel } from "./work-dashboard-outline";
import { WorkDashboardSidebar } from "./work-dashboard-sidebar";

export function WorkDashboardView({ dashboard }: { dashboard: WorkDashboardController }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f5f6f2] font-sans text-slate-900 antialiased selection:bg-emerald-100 dark:bg-[#0d1117] dark:text-slate-100 dark:selection:bg-emerald-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 app-noise opacity-[0.025] dark:opacity-[0.05]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50 dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] dark:opacity-35" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <WorkDashboardHeader dashboard={dashboard} />

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-5 md:py-6 lg:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_384px]">
            <div className="min-w-0 space-y-5">
              <WorkDashboardHero dashboard={dashboard} />
              <WorkDashboardSidebar className="flex lg:hidden" dashboard={dashboard} />
              <WorkSynopsisCard dashboard={dashboard} />
              <WorkVolumesPanel dashboard={dashboard} />
              <WorkCharactersPanel dashboard={dashboard} />
            </div>

            <WorkDashboardSidebar className="hidden lg:block" dashboard={dashboard} />
          </div>
        </main>
      </div>

      <WorkChapterCommandDialog dashboard={dashboard} />
      <OutlineRefineDialog dashboard={dashboard} />
    </div>
  );
}

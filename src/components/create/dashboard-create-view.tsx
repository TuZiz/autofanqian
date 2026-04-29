"use client";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

import { CreateGenreSection } from "./create-genre-section";
import { CreateIdeaSection } from "./create-idea-section";
import { CreateOptionsSection } from "./create-options-section";
import { CreateSteps } from "./create-steps";
import { CreateTemplateSidebar } from "./create-template-sidebar";

type DashboardCreateViewProps = {
  create: DashboardCreateController;
};

export function DashboardCreateView({ create }: DashboardCreateViewProps) {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden bg-[#f5f6f2] font-sans transition-[background-color,color] dark:bg-[#0d1117]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <DashboardTopbar
        title="创作工作台"
        userEmail={create.userEmail}
        isAdmin={create.isAdmin}
        showBackToDashboard
      />

      <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-6 sm:px-5 lg:px-6">
        <div className="max-w-4xl">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Create Workbench</div>
          <h1 className="theme-heading mt-2 text-3xl font-black tracking-tight md:text-4xl">
            创建新作品
          </h1>
          <p className="theme-subheading mt-3 max-w-2xl text-sm font-medium leading-7">
            描述你的创意，让 AI 帮你生成完整的小说大纲。
          </p>
        </div>

        <CreateSteps />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row">
          <section className="glass-panel w-full rounded-lg p-5 shadow-sm lg:w-2/3 lg:p-6">
            <form className="space-y-8" onSubmit={create.handleSubmit}>
              <CreateGenreSection create={create} />
              <CreateIdeaSection create={create} />
              <CreateOptionsSection create={create} />
            </form>
          </section>

          <CreateTemplateSidebar create={create} />
        </div>
      </div>
    </main>
  );
}

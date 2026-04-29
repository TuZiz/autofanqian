"use client";

import { Flame, Sparkles } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type CreateTemplateSidebarProps = {
  create: DashboardCreateController;
};

export function CreateTemplateSidebar({ create }: CreateTemplateSidebarProps) {
  const { handleTemplateUse, hotTemplates, selectedGenre } = create;

  return (
    <aside className="glass-panel sticky top-24 flex h-fit flex-1 flex-col overflow-hidden rounded-lg shadow-sm">
      <div className="theme-divider flex items-center gap-2 border-b px-6 py-5">
        <Flame className="h-5 w-5 text-emerald-600/80 dark:text-emerald-300/80" />
        <h3 className="theme-heading font-black tracking-tight">热门模板</h3>
      </div>

      <div className="flex min-h-[420px] flex-1 flex-col p-6">
        {!selectedGenre ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="theme-chip mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
              <Sparkles className="h-9 w-9 text-slate-400 dark:text-white/30" />
            </div>
            <p className="theme-heading font-medium">请先选择小说类型</p>
            <p className="theme-muted mt-1 text-sm">选择后将显示对应的热门模板</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hotTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => void handleTemplateUse(template)}
                className="theme-card-soft cursor-pointer rounded-lg p-4 text-left text-sm leading-relaxed theme-subheading transition hover:border-emerald-300 hover:bg-[var(--theme-surface-hover)]"
              >
                {template.content}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

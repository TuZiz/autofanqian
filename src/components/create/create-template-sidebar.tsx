"use client";

import { Flame, Sparkles } from "lucide-react";
import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type CreateTemplateSidebarProps = {
  create: DashboardCreateController;
};

export function CreateTemplateSidebar({ create }: CreateTemplateSidebarProps) {
  const { handleTemplateUse, hotTemplates, selectedGenre } = create;

  return (
    <aside className="flex h-fit flex-col overflow-hidden rounded-[32px] bg-white/60 shadow-xl shadow-black/5 ring-1 ring-white/60 backdrop-blur-2xl dark:bg-zinc-900/50 dark:ring-white/10">
      <div className="flex items-center gap-3 border-b border-zinc-200/50 bg-white/40 px-8 py-6 dark:border-white/5 dark:bg-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400">
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">热门灵感模板</h3>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">点击快速填入灵感描述</p>
        </div>
      </div>

      <div className="flex min-h-[420px] flex-1 flex-col p-6">
        {!selectedGenre ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-white/5 shadow-inner">
              <Sparkles className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <p className="text-base font-bold text-zinc-900 dark:text-white">请先选择一个世界类型</p>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              不同类型下，我们为您准备了专属的热门模版
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {hotTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => void handleTemplateUse(template)}
                className="group relative overflow-hidden rounded-[20px] bg-white p-5 text-left text-[14px] font-medium leading-relaxed text-zinc-600 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-blue-50 hover:text-blue-900 hover:shadow-md hover:ring-blue-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-blue-500/10 dark:hover:text-blue-100 dark:hover:ring-blue-500/30"
              >
                <span className="relative z-10 line-clamp-4">{template.content}</span>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100 dark:to-blue-400/5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

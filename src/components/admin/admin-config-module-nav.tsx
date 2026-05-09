import { ChevronRight } from "lucide-react";

import type { ConfigModule, ConfigModuleKey } from "@/components/admin/admin-config-model";
import { cn } from "@/lib/utils";

type ModuleNavProps = {
  activeKey: ConfigModuleKey;
  modules: ConfigModule[];
  onSelect: (key: ConfigModuleKey) => void;
};

export function ModuleNav({ activeKey, modules, onSelect }: ModuleNavProps) {
  return (
    <aside className="border-b border-stone-100 bg-stone-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:border-b-0 lg:border-r">
      <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
        Modules
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {modules.map((module) => {
          const Icon = module.icon;
          const selected = module.key === activeKey;

          return (
            <button
              key={module.key}
              type="button"
              onClick={() => onSelect(module.key)}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition",
                selected
                  ? "border-stone-950 bg-stone-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-stone-950"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-200 dark:hover:bg-white/[0.06]",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? "border-white/20 bg-white/10 dark:border-stone-950/10 dark:bg-stone-950/10"
                      : "border-stone-200 bg-stone-50 dark:border-white/10 dark:bg-white/[0.04]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{module.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[11px] font-bold",
                      selected
                        ? "text-white/65 dark:text-stone-600"
                        : "text-stone-500 dark:text-stone-400",
                    )}
                  >
                    {module.active}/{module.total} 启用
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

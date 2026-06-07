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
    <aside className="rounded-[24px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.78)] p-3 shadow-[var(--theme-shadow-card)]">
      <div className="mb-3 px-1">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          模块导航
        </p>
        <p className="mt-1 text-xs font-medium leading-5 text-[var(--theme-text-secondary)]">
          左栏负责模块切换，保持清晰的启用数量与当前选中状态。
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {modules.map((module) => {
          const Icon = module.icon;
          const selected = module.key === activeKey;

          return (
            <button
              key={module.key}
              type="button"
              onClick={() => onSelect(module.key)}
              className={cn(
                "group relative overflow-hidden rounded-[20px] border px-3 py-3 text-left transition",
                selected
                  ? "border-[var(--theme-brand-border)] bg-[linear-gradient(180deg,rgba(56,174,234,0.12),rgba(255,255,255,0.96))] shadow-[var(--theme-shadow-card)]"
                  : "border-[var(--theme-border)] bg-[rgba(255,255,255,0.92)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-3 left-0 w-1 rounded-r-full transition",
                  selected ? "bg-[var(--theme-brand-500)]" : "bg-transparent group-hover:bg-[var(--theme-brand-border)]",
                )}
              />
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3 pl-2">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border",
                      selected
                        ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[var(--theme-text-strong)]">
                      {module.title}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--theme-text-muted)]">
                      {module.description}
                    </span>
                    <span className="mt-2 inline-flex rounded-full border border-[var(--theme-border)] bg-[rgba(255,255,255,0.74)] px-2.5 py-1 text-[11px] font-black text-[var(--theme-text-secondary)]">
                      {module.active}/{module.total} 已启用
                    </span>
                  </span>
                </span>
                <ChevronRight
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 transition",
                    selected
                      ? "translate-x-0 text-[var(--theme-brand-text)]"
                      : "text-[var(--theme-text-muted)] group-hover:translate-x-0.5",
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

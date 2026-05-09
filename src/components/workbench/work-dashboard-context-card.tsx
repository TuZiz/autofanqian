"use client";

import type { ComponentType, ReactNode } from "react";

export function ContextCard<T>({
  emptyText,
  icon: Icon,
  items,
  renderItem,
  title,
}: {
  emptyText: string;
  icon: ComponentType<{ className?: string }>;
  items: T[];
  renderItem: (item: T) => ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/50 p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900/50">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[var(--theme-border)] dark:bg-zinc-950 dark:ring-[var(--theme-border)]">
            <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <h4 className="text-base font-bold text-zinc-950 dark:text-white">{title}</h4>
        </div>
        <span className="rounded-xl border border-[var(--theme-border)] bg-zinc-50/80 px-2.5 py-1 text-[11px] font-bold text-zinc-500 shadow-sm dark:border-[var(--theme-border)] dark:bg-zinc-800/80 dark:text-zinc-400">
          {items.length}
        </span>
      </div>
      <div className="space-y-4">
        {items.length ? (
          items.map(renderItem)
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--theme-border)] px-4 py-8 text-center text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:border-[var(--theme-border)] dark:text-zinc-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-white/60 bg-[var(--theme-surface-soft)] p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] shadow-sm ring-1 ring-[var(--theme-border)]">
            <Icon className="h-5 w-5 text-[var(--theme-text-muted)]" />
          </div>
          <h4 className="text-base font-bold text-[var(--theme-text-strong)]">{title}</h4>
        </div>
        <span className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--theme-text-muted)] shadow-sm">
          {items.length}
        </span>
      </div>
      <div className="space-y-4">
        {items.length ? (
          items.map(renderItem)
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--theme-border)] px-4 py-8 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

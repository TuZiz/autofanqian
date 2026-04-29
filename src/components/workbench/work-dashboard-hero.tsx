"use client";

import { Check, Compass, Gauge } from "lucide-react";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { cn } from "@/lib/utils";

export function WorkDashboardHero({ dashboard }: { dashboard: WorkDashboardController }) {
  const {
    error,
    headerChips,
    outline,
    work,
  } = dashboard;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-6">
      <div className="flex min-w-0 flex-col justify-between gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {headerChips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-bold",
                chip.tone === "brand"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              {chip.label}
            </span>
          ))}
          {outline ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/25 dark:bg-slate-950 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              大纲已锁定
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Workbench Overview
          </p>
          <h2 className="max-w-4xl text-2xl font-black leading-tight text-slate-950 dark:text-white md:text-3xl">
            {work ? `《${work.title}》` : "作品加载失败"}
          </h2>
          <p className="max-w-4xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            {work ? work.idea : error || "暂无作品脉络信息"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-slate-400" />
            {work?.platformLabel || work?.platformId || "未指定平台"}
          </span>
          <span className="hidden h-3 w-px bg-slate-200 sm:inline-block dark:bg-slate-800" />
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-emerald-500" />
            创作核心就绪
          </span>
        </div>
      </div>
    </section>
  );
}

"use client";

import { CheckCircle2, FileText, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const createSteps: Array<{
  title: string;
  icon: LucideIcon;
  active?: boolean;
}> = [
  { title: "输入创意", icon: Lightbulb, active: true },
  { title: "确认大纲", icon: FileText },
  { title: "创建成功", icon: CheckCircle2 },
];

type CreateStepsProps = {
  compact?: boolean;
};

export function CreateSteps({ compact = false }: CreateStepsProps) {
  if (compact) {
    return (
      <section className="w-full">
        <div className="flex items-center justify-between gap-2">
          {createSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.active;

            return (
              <div key={step.title} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                    isActive
                      ? "bg-[var(--theme-brand-500)] text-white shadow-sm shadow-[var(--theme-brand-500)]/25"
                      : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-xs font-bold",
                      isActive ? "text-[var(--theme-brand-text)]" : "text-[var(--theme-text-muted)]",
                    )}
                  >
                    {step.title}
                  </div>
                </div>

                {index < createSteps.length - 1 ? (
                  <div className="hidden h-px flex-1 bg-[var(--theme-divider)] sm:block" />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-4 py-3 shadow-sm">
        {createSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.active;

          return (
            <div key={step.title} className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-[var(--theme-brand-500)] text-white shadow-sm shadow-[var(--theme-brand-500)]/25"
                    : "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)] ring-1 ring-[var(--theme-border)]",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-bold",
                    isActive ? "text-[var(--theme-brand-text)]" : "text-[var(--theme-text-muted)]",
                  )}
                >
                  {step.title}
                </div>
              </div>

              {index < createSteps.length - 1 ? (
                <div className="hidden h-px flex-1 bg-[var(--theme-divider)] md:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

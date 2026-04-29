"use client";

import { CheckCircle2, FileText, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const createSteps: Array<{
  title: string;
  icon: LucideIcon;
  active?: boolean;
}> = [
  { title: "输入创意", icon: Lightbulb, active: true },
  { title: "确认大纲", icon: FileText },
  { title: "创建成功", icon: CheckCircle2 },
];

export function CreateSteps() {
  return (
    <section className="glass-panel mt-6 overflow-hidden rounded-lg p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-5">
        {createSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="contents md:flex md:min-w-0 md:flex-1 md:items-center md:gap-5"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className={
                    step.active
                      ? "flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-sm"
                      : "flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] theme-weak"
                  }
                >
                  <Icon className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <div
                    className={
                      step.active
                        ? "theme-heading text-xl font-semibold tracking-tight"
                        : "theme-subheading text-xl font-medium tracking-tight"
                    }
                  >
                    {step.title}
                  </div>
                </div>
              </div>

              {index < createSteps.length - 1 ? (
                <div className="theme-divider ml-7 h-10 w-px border-l md:ml-0 md:h-px md:flex-1 md:border-l-0 md:border-t" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

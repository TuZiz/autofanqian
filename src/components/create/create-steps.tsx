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

export function CreateSteps() {
  return (
    <section className="relative mx-auto w-full max-w-3xl">
      <div className="absolute left-[10%] right-[10%] top-[28px] h-[2px] -translate-y-1/2 bg-zinc-200 dark:bg-zinc-800 sm:top-[32px]" />
      
      <div className="relative flex justify-between">
        {createSteps.map((step) => {
          const Icon = step.icon;
          const isActive = step.active;

          return (
            <div
              key={step.title}
              className="flex w-1/3 flex-col items-center justify-center gap-3 relative z-10"
            >
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-500 sm:h-16 sm:w-16",
                  isActive
                    ? "bg-blue-600 text-white shadow-blue-500/30 ring-4 ring-white dark:ring-black scale-110"
                    : "bg-white text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                )}
              >
                <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive && "animate-pulse")} />
              </div>

              <div
                className={cn(
                  "text-center text-sm font-black tracking-tight sm:text-base",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {step.title}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

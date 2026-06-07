"use client";

import { BookOpen, Feather } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type CreateMode = "long" | "short";

const modes: Array<{
  href: string;
  icon: typeof BookOpen;
  id: CreateMode;
  label: string;
}> = [
  { href: "/dashboard/create", icon: BookOpen, id: "long", label: "长篇连载" },
  { href: "/dashboard/create/short", icon: Feather, id: "short", label: "短篇小说" },
];

export function CreateModeSwitch({ active }: { active: CreateMode }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)]/88 p-1 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.42)]">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const selected = active === mode.id;

        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex h-8 min-w-[118px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-black transition sm:min-w-[132px]",
              selected
                ? "theme-brand-gradient-bg text-white shadow-[0_10px_20px_-16px_rgba(14,165,233,0.75)]"
                : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { BookOpen, Feather } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type CreateMode = "long" | "short";

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
    <div className="inline-flex shrink-0 items-center rounded-full border border-slate-200/80 bg-white/82 p-1 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.38),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const selected = active === mode.id;

        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-[104px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-bold transition-all duration-200",
              selected
                ? "create-accent text-white shadow-[0_12px_24px_-16px_rgba(20,32,29,0.88)]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
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


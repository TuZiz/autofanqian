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
    <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const selected = active === mode.id;

        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-all duration-200",
              selected
                ? "bg-slate-950 text-white shadow-[0_8px_18px_-12px_rgba(15,23,42,0.9)]"
                : "text-slate-500 hover:bg-white hover:text-slate-900",
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

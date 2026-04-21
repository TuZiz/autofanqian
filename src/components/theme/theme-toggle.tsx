"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const label = theme === "dark" ? "切换到日间模式" : "切换到夜间模式";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
        "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
        "dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

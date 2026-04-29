"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

function subscribeToHydration() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  const label = !mounted
    ? "切换主题"
    : theme === "dark"
      ? "切换到浅色模式"
      : "切换到深色模式";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "theme-icon-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {mounted ? (
        theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4 rounded-full bg-current/25" aria-hidden="true" />
      )}
    </button>
  );
}

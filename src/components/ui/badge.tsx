"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeStyleMap: Record<string, string> = {
  default:
    "bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] border-[var(--theme-brand-border)]",
  secondary:
    "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)] border-[var(--theme-border)]",
  destructive:
    "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] border-[var(--theme-danger-border)]",
  outline:
    "border-[var(--theme-border)] text-[var(--theme-text-primary)]",
  ghost:
    "border-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
  link: "border-transparent text-[var(--theme-brand-600)] underline-offset-4 hover:underline",
};

function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}) {
  return (
    <span
      className={cn(
        "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all",
        badgeStyleMap[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

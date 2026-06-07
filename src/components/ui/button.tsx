"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default:
    "bg-[var(--theme-brand-500)] text-white shadow-sm hover:bg-[var(--theme-brand-600)] active:translate-y-px",
  outline:
    "border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
  secondary:
    "bg-[var(--theme-surface-overlay)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]",
  ghost:
    "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
  destructive:
    "bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)] border border-[var(--theme-danger-border)] hover:brightness-95",
  link: "text-[var(--theme-brand-600)] underline-offset-4 hover:underline",
};

const sizeStyles: Record<string, string> = {
  default: "h-8 gap-1.5 px-2.5 rounded-lg",
  xs: "h-6 gap-1 rounded-md px-2 text-xs",
  sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem]",
  lg: "h-9 gap-1.5 px-3 rounded-lg",
  icon: "size-8 rounded-lg",
  "icon-xs": "size-6 rounded-md",
  "icon-sm": "size-7 rounded-md",
  "icon-lg": "size-9 rounded-lg",
};

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  children?: ReactNode;
}) {
  return (
    <button
      className={cn(
        "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/40 focus-visible:ring-offset-1",
        "active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { Button };

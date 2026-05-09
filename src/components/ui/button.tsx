"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-border bg-background hover:bg-muted hover:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost:
    "hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles: Record<string, string> = {
  default: "h-8 gap-1.5 px-2.5",
  xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs",
  sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]",
  lg: "h-9 gap-1.5 px-2.5",
  icon: "size-8",
  "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)]",
  "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)]",
  "icon-lg": "size-9",
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
        "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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

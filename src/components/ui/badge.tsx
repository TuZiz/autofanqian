"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeStyleMap: Record<string, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-danger/10 text-danger",
  outline: "border-border text-foreground",
  ghost: "hover:bg-muted hover:text-muted-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & { variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" }) {
  return (
    <span
      className={cn(
        "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all",
        badgeStyleMap[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

"use client";

import { ScrollShadow } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <ScrollShadow
      className={cn("relative size-full", className)}
      {...props}
    >
      {children}
    </ScrollShadow>
  );
}

function ScrollBar({}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  // ScrollShadow handles scrollbars internally
  return null;
}

export { ScrollArea, ScrollBar };

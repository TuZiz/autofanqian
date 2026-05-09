"use client";

import { Separator as HeroSeparator } from "@heroui/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: ComponentProps<typeof HeroSeparator> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <HeroSeparator
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };

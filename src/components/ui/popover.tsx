"use client";

import {
  PopoverRoot,
  PopoverTrigger as HeroPopoverTrigger,
  PopoverContent as HeroPopoverContent,
  PopoverHeading,
} from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function Popover({ children, ...props }: ComponentProps<"div"> & { children?: ReactNode }) {
  return <PopoverRoot {...props}>{children}</PopoverRoot>;
}

function PopoverTrigger({ ...props }: ComponentProps<typeof HeroPopoverTrigger>) {
  return <HeroPopoverTrigger {...props} />;
}

function PopoverContent({
  className,
  children,
  ...props
}: ComponentProps<typeof HeroPopoverContent>) {
  return (
    <HeroPopoverContent
      className={cn(
        "z-50 flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </HeroPopoverContent>
  );
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <PopoverHeading
      className={cn("font-medium", className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};

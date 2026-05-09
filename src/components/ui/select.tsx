"use client";

import {
  SelectRoot,
  SelectTrigger as HeroSelectTrigger,
  SelectValue as HeroSelectValue,
  SelectPopover,
  ListBox,
  ListBoxItem,
  ListBoxSection,
} from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

const Select = SelectRoot;

function SelectGroup({ className, children, ...props }: { className?: string; children?: ReactNode }) {
  return (
    <ListBoxSection className={cn("scroll-my-1 p-1", className)} {...props}>
      {children}
    </ListBoxSection>
  );
}

function SelectValue({ className, ...props }: { className?: string; children?: ReactNode }) {
  return (
    <HeroSelectValue
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: {
  className?: string;
  size?: "sm" | "default";
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <HeroSelectTrigger
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      data-size={size}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </HeroSelectTrigger>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <SelectPopover
      className={cn(
        "relative isolate z-50 max-h-[var(--available-height)] min-w-36 origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    >
      <ListBox>{children}</ListBox>
    </SelectPopover>
  );
}

function SelectLabel({
  className,
  ...props
}: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <ListBoxItem
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </ListBoxItem>
  );
}

function SelectSeparator({
  className,
  ...props
}: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: { className?: string }) {
  return (
    <div
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </div>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: { className?: string }) {
  return (
    <div
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

"use client";

import {
  TabsRoot,
  TabList,
  Tab,
  TabPanel,
  TabIndicator,
} from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  children,
  ...props
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <TabsRoot
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className,
      )}
      {...props}
    >
      {children}
    </TabsRoot>
  );
}

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: {
  className?: string;
  variant?: "default" | "line";
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <TabList
      className={cn(
        "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-[var(--theme-text-muted)]",
        "group-data-[orientation=horizontal]/tabs:h-8",
        "group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
        variant === "default" && "bg-[var(--theme-surface-overlay)]",
        variant === "line" && "gap-1 bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
      {variant === "default" && (
        <TabIndicator className="rounded-md bg-[var(--theme-surface-solid)] shadow-sm" />
      )}
    </TabList>
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  id?: string;
  [key: string]: unknown;
}) {
  return (
    <Tab
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap",
        "text-[var(--theme-text-muted)] transition-all",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "hover:text-[var(--theme-text-strong)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/40",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[selected]:bg-[var(--theme-surface-solid)] data-[selected]:text-[var(--theme-text-strong)] data-[selected]:shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </Tab>
  );
}

function TabsContent({
  className,
  children,
  id,
  ...props
}: {
  className?: string;
  children: ReactNode;
  id?: string;
  [key: string]: unknown;
}) {
  return (
    <TabPanel
      id={id}
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    >
      {children}
    </TabPanel>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

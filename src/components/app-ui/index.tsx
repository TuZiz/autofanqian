"use client";

import {
  Button,
  Card,
  Chip,
  Drawer,
  Input,
  Modal,
  ProgressBar,
  Table,
  Tabs,
  TextArea,
} from "@heroui/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function AppButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "min-h-9 rounded-md px-3 text-sm font-bold transition active:scale-[0.98]",
        className,
      )}
    />
  );
}

export function AppInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-9 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-semibold text-[var(--theme-text-primary)] shadow-sm placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:outline-none focus:ring-2 focus:ring-emerald-500/15",
        className,
      )}
    />
  );
}

export function AppTextarea({ className, ...props }: ComponentProps<typeof TextArea>) {
  return (
    <TextArea
      {...props}
      className={cn(
        "min-h-24 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-sm font-semibold leading-6 text-[var(--theme-text-primary)] shadow-sm placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-brand-border)] focus:outline-none focus:ring-2 focus:ring-emerald-500/15",
        className,
      )}
    />
  );
}

export function AppCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      {...props}
      className={cn(
        "rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] shadow-sm",
        className,
      )}
    />
  );
}

export function AppChip({ className, ...props }: ComponentProps<typeof Chip>) {
  return (
    <Chip
      {...props}
      className={cn(
        "rounded-md border border-[var(--theme-border)] px-2 py-0.5 text-[11px] font-bold",
        className,
      )}
    />
  );
}

export function AppProgress({ className, ...props }: ComponentProps<typeof ProgressBar>) {
  return <ProgressBar {...props} className={cn("h-2 rounded-full", className)} />;
}

export const AppModal = Modal;
export const AppDrawer = Drawer;
export const AppTabs = Tabs;
export const AppTable = Table;

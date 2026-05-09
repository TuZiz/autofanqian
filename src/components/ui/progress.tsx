"use client";

import {
  ProgressBarRoot,
  ProgressBarTrack,
  ProgressBarFill,
  ProgressBarOutput,
} from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  children,
  value,
  ...props
}: ComponentProps<typeof ProgressBarRoot> & { children?: ReactNode }) {
  return (
    <ProgressBarRoot
      value={value}
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressBarRoot>
  );
}

function ProgressTrack({
  className,
  ...props
}: ComponentProps<typeof ProgressBarTrack>) {
  return (
    <ProgressBarTrack
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  ...props
}: ComponentProps<typeof ProgressBarFill>) {
  return (
    <ProgressBarFill
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  );
}

function ProgressLabel({
  className,
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function ProgressValue({
  className,
  ...props
}: ComponentProps<typeof ProgressBarOutput>) {
  return (
    <ProgressBarOutput
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};

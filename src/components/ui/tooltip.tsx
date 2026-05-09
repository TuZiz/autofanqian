"use client";

import {
  Tooltip as HeroTooltip,
  TooltipTrigger as HeroTooltipTrigger,
  TooltipContent as HeroTooltipContent,
  TooltipArrow,
  TooltipRoot,
} from "@heroui/react";
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

function TooltipProvider({ children }: { children: ReactNode; delay?: number }) {
  return <>{children}</>;
}

function Tooltip({ children, ...props }: ComponentProps<typeof TooltipRoot>) {
  return <HeroTooltip {...props}>{children}</HeroTooltip>;
}

function TooltipTrigger({
  children,
  className,
  ...props
}: ComponentProps<typeof HeroTooltipTrigger>) {
  const onlyChild = Children.only(children) as ReactElement<{ className?: string }>;

  if (!isValidElement(onlyChild)) {
    return <HeroTooltipTrigger {...props}>{children}</HeroTooltipTrigger>;
  }

  const mergedChild = className
    ? cloneElement(onlyChild, {
        className: cn(onlyChild.props.className, className),
      })
    : onlyChild;

  return <HeroTooltipTrigger {...props}>{mergedChild}</HeroTooltipTrigger>;
}

function TooltipContent({
  className,
  children,
  ...props
}: ComponentProps<typeof HeroTooltipContent>) {
  return (
    <HeroTooltipContent
      className={cn(
        "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-[0.95rem] border border-[var(--tooltip-border,rgba(148,163,184,0.18))] bg-[var(--tooltip-bg,rgba(255,255,255,0.98))] px-3 py-2 text-xs text-[var(--tooltip-fg,rgba(24,24,27,0.92))] shadow-[var(--tooltip-shadow,0_18px_32px_-24px_rgba(15,23,42,0.2))] backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipArrow className="fill-[var(--tooltip-bg,rgba(255,255,255,0.98))] drop-shadow-[0_8px_14px_rgba(15,23,42,0.08)]" />
    </HeroTooltipContent>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

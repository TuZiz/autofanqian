"use client";

import {
  Focusable,
  OverlayArrow,
  Tooltip as AriaTooltipContent,
  TooltipTrigger as AriaTooltipRoot,
} from "react-aria-components";
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type DOMAttributes,
  type FocusEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import type { FocusableElement } from "@react-types/shared";

import { cn } from "@/lib/utils";

type TooltipTriggerChildProps = ComponentProps<"button"> & {
  className?: string;
};

type TooltipTriggerProps = ComponentProps<"span"> & {
  children: ReactNode;
};

type TooltipContentProps = Omit<ComponentProps<typeof AriaTooltipContent>, "children"> & {
  children: ReactNode;
};

function TooltipProvider({ children }: { children: ReactNode; delay?: number }) {
  return <>{children}</>;
}

function Tooltip({ children, ...props }: ComponentProps<typeof AriaTooltipRoot>) {
  return <AriaTooltipRoot {...props}>{children}</AriaTooltipRoot>;
}

function TooltipTrigger({
  children,
  className,
  ...props
}: TooltipTriggerProps) {
  const onlyChild = Children.only(children) as ReactElement<TooltipTriggerChildProps, string>;

  if (!isValidElement(onlyChild)) {
    return (
      <Focusable>
        <span className={cn("inline-flex", className)} role="button" tabIndex={0} {...props}>
          {children}
        </span>
      </Focusable>
    );
  }

  const mergedChild = className
    ? cloneElement(onlyChild, {
        className: cn(onlyChild.props.className, className),
    })
    : onlyChild;

  const focusableChild = cloneElement(
    mergedChild,
    props as DOMAttributes<FocusableElement>,
  ) as ReactElement<DOMAttributes<FocusableElement>, string>;

  return <Focusable>{focusableChild}</Focusable>;
}

function TooltipContent({
  className,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <AriaTooltipContent
      className={cn(
        "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-[0.95rem] border border-[var(--tooltip-border,rgba(148,163,184,0.18))] bg-[var(--tooltip-bg,rgba(255,255,255,0.98))] px-3 py-2 text-xs text-[var(--tooltip-fg,rgba(24,24,27,0.92))] shadow-[var(--tooltip-shadow,0_18px_32px_-24px_rgba(15,23,42,0.2))] backdrop-blur-sm",
        className,
      )}
      {...(props as Omit<ComponentProps<typeof AriaTooltipContent>, "children"> & {
        onBlur?: FocusEventHandler<HTMLDivElement>;
        onFocus?: FocusEventHandler<HTMLDivElement>;
      })}
    >
      {children}
      <OverlayArrow className="fill-[var(--tooltip-bg,rgba(255,255,255,0.98))] drop-shadow-[0_8px_14px_rgba(15,23,42,0.08)]">
        <svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0C5.48483 8 6.5 8 12 0Z" />
        </svg>
      </OverlayArrow>
    </AriaTooltipContent>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

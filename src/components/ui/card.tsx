import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

function Card({
  className,
  size = "default",
  children,
  ...props
}: ComponentProps<"div"> & { size?: "default" | "sm"; children?: ReactNode }) {
  return (
    <div
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] py-4 text-sm text-[var(--theme-text-primary)] shadow-[var(--theme-shadow-card)]",
        "data-[size=sm]:gap-3 data-[size=sm]:py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4",
        "group-data-[size=sm]/card:px-3",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-base leading-snug font-semibold text-[var(--theme-text-strong)]",
        "group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm text-[var(--theme-text-secondary)]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center rounded-b-xl border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] p-4",
        "group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

"use client";

import {
  DropdownRoot,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu as HeroDropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ChevronRightIcon, CheckIcon } from "lucide-react";

function DropdownMenu({ children, ...props }: { children?: ReactNode }) {
  return <DropdownRoot {...props}>{children}</DropdownRoot>;
}

function DropdownMenuPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuTrigger({ children, ...props }: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <DropdownTrigger {...props}>{children}</DropdownTrigger>;
}

function DropdownMenuContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <DropdownPopover
      className={cn(
        "z-50 max-h-[var(--available-height)] w-[var(--anchor-width)] min-w-32 origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    >
      <HeroDropdownMenu>{children}</HeroDropdownMenu>
    </DropdownPopover>
  );
}

function DropdownMenuGroup({ children, ...props }: { children?: ReactNode }) {
  return <DropdownSection {...props}>{children}</DropdownSection>;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: {
  className?: string;
  inset?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  children,
  ...props
}: {
  className?: string;
  inset?: boolean;
  variant?: "default" | "destructive";
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <DropdownItem
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownItem>
  );
}

function DropdownMenuSub({ children, ...props }: { children?: ReactNode }) {
  return <DropdownRoot {...props}>{children}</DropdownRoot>;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: {
  className?: string;
  inset?: boolean;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <DropdownTrigger
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </DropdownTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <DropdownPopover
      className={cn(
        "w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    >
      <HeroDropdownMenu>{children}</HeroDropdownMenu>
    </DropdownPopover>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  checked?: boolean;
  inset?: boolean;
  [key: string]: unknown;
}) {
  return (
    <DropdownItem
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        {checked && <CheckIcon />}
      </span>
      {children}
    </DropdownItem>
  );
}

function DropdownMenuRadioGroup({ children, ...props }: { children?: ReactNode }) {
  return <DropdownSection {...props}>{children}</DropdownSection>;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  inset?: boolean;
  [key: string]: unknown;
}) {
  return (
    <DropdownItem
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <CheckIcon />
      </span>
      {children}
    </DropdownItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: { className?: string }) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};

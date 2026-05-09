"use client";

import {
  DrawerRoot,
  DrawerTrigger,
  DrawerBackdrop,
  DrawerContent as HeroDrawerContent,
  DrawerHeading,
  DrawerCloseTrigger,
  DrawerHandle,
} from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

function Sheet({ children, ...props }: { children?: ReactNode; isOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  return <DrawerRoot {...props}>{children}</DrawerRoot>;
}

function SheetTrigger({ children, ...props }: { children?: ReactNode; className?: string }) {
  return <DrawerTrigger {...props}>{children}</DrawerTrigger>;
}

function SheetClose({ children, ...props }: { children?: ReactNode; className?: string }) {
  return <DrawerCloseTrigger {...props}>{children}</DrawerCloseTrigger>;
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
}: {
  className?: string;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <>
      <DrawerBackdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs" />
      <HeroDrawerContent
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:sm:max-w-sm",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:sm:max-w-sm",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b",
          className,
        )}
      >
        <DrawerHandle />
        {children}
        {showCloseButton && (
          <DrawerCloseTrigger>
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DrawerCloseTrigger>
        )}
      </HeroDrawerContent>
    </>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, children, ...props }: { className?: string; children?: ReactNode }) {
  return (
    <DrawerHeading
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    >
      {children}
    </DrawerHeading>
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

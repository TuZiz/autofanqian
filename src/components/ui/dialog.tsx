"use client";

import {
  ModalRoot,
  ModalTrigger,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeading,
  ModalCloseTrigger,
} from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

function Dialog({ children, ...props }: { children?: ReactNode; isOpen?: boolean; onOpenChange?: (open: boolean) => void; defaultOpen?: boolean }) {
  return <ModalRoot {...props}>{children}</ModalRoot>;
}

function DialogTrigger({ children, ...props }: { children?: ReactNode; className?: string }) {
  return <ModalTrigger {...props}>{children}</ModalTrigger>;
}

function DialogClose({ children, ...props }: { children?: ReactNode; className?: string }) {
  return <ModalCloseTrigger {...props}>{children}</ModalCloseTrigger>;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string;
  children?: ReactNode;
  showCloseButton?: boolean;
}) {
  return (
    <ModalContainer>
      <ModalBackdrop className="fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-sm" />
      <ModalDialog
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-5 text-sm text-[var(--theme-text-primary)] shadow-[var(--theme-shadow-panel)] outline-none sm:max-w-sm",
          className,
        )}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-[var(--theme-text-muted)] transition-colors hover:text-[var(--theme-text-strong)] hover:bg-[var(--theme-surface-overlay)]"
            onClick={() => {
              const event = new Event("close", { bubbles: true });
              document.dispatchEvent(event);
            }}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </ModalDialog>
    </ModalContainer>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      className={cn(
        "-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-xl border-t border-[var(--theme-divider)] bg-[var(--theme-surface-overlay)] p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <ModalCloseTrigger>
          <button type="button" className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]">
            Close
          </button>
        </ModalCloseTrigger>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: { className?: string; children?: ReactNode }) {
  return (
    <ModalHeading
      className={cn("text-base leading-none font-semibold text-[var(--theme-text-strong)]", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "text-sm text-[var(--theme-text-secondary)] *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-[var(--theme-text-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};

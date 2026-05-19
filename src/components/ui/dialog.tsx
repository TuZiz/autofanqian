"use client";

import {
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeading,
} from "@heroui/react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type DialogContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within Dialog`);
  }

  return context;
}

function Dialog({
  children,
  defaultOpen = false,
  isOpen,
  onOpenChange,
}: {
  children?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isOpen ?? uncontrolledOpen;
  const value = useMemo<DialogContextValue>(() => ({
    isOpen: open,
    setOpen(nextOpen) {
      if (isOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
  }), [isOpen, onOpenChange, open]);

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  children,
  onClick,
  type = "button",
  ...props
}: ComponentProps<"button"> & { children?: ReactNode }) {
  const { setOpen } = useDialogContext("DialogTrigger");

  return (
    <button
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(true);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function DialogClose({
  children,
  onClick,
  type = "button",
  ...props
}: ComponentProps<"button"> & { children?: ReactNode }) {
  const { setOpen } = useDialogContext("DialogClose");

  return (
    <button
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
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
  const { isOpen, setOpen } = useDialogContext("DialogContent");

  return (
    <ModalBackdrop
      className="fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-sm"
      isOpen={isOpen}
      onOpenChange={setOpen}
    >
      <ModalContainer>
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
            onClick={() => setOpen(false)}
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </ModalDialog>
      </ModalContainer>
    </ModalBackdrop>
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
  const { setOpen } = useDialogContext("DialogFooter");

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
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-sm font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
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

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-2 text-sm",
        "text-[var(--theme-text-primary)] outline-none transition-colors",
        "placeholder:text-[var(--theme-text-muted)]",
        "focus-visible:border-[var(--theme-brand-500)] focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--theme-danger-text)] aria-invalid:ring-2 aria-invalid:ring-[var(--theme-danger-text)]/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

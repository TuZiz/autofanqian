import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-sm",
        "text-[var(--theme-text-primary)] outline-none transition-colors",
        "placeholder:text-[var(--theme-text-muted)]",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--theme-text-primary)]",
        "focus-visible:border-[var(--theme-brand-500)] focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-500)]/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--theme-danger-text)] aria-invalid:ring-2 aria-invalid:ring-[var(--theme-danger-text)]/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

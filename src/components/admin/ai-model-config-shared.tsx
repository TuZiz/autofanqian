import { CheckCircle2, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 text-xs font-semibold text-[var(--theme-text-secondary)] shadow-sm">
      <span className="text-[var(--theme-text-muted)]">{label}</span>
      <span className="text-[var(--theme-text-strong)]">{value}</span>
    </span>
  );
}

export function StatusBadge({
  configured,
  label,
}: {
  configured: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold",
        configured
          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
          : "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]",
      )}
    >
      {configured ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <ShieldAlert className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

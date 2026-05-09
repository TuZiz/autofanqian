import { CheckCircle2, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-600 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="text-stone-950 dark:text-stone-50">{value}</span>
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
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-200",
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

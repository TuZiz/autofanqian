"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";
import { cn } from "@/lib/utils";

export function SubmitOutlineButton({
  compact = false,
  create,
  sidebar = false,
}: {
  compact?: boolean;
  create: DashboardCreateController;
  sidebar?: boolean;
}) {
  const disabled = create.submitBusy;
  const title = create.submitBusy
    ? "正在生成大纲"
    : create.canSubmitOutline
      ? "生成大纲"
      : create.submitBlockedReason;

  return (
    <button
      type="submit"
      form="dashboard-create-form"
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        sidebar ? "h-11 w-full" : "h-11",
        compact ? "hidden min-[480px]:flex" : "flex flex-[1.5]",
        create.canSubmitOutline
          ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          : "border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-sm hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]",
      )}
    >
      {create.submitBusy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          正在生成大纲
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          生成大纲
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

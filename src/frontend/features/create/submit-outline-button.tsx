"use client";

import { Sparkles } from "lucide-react";

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
    ? "正在创建大纲"
    : create.canSubmitOutline
      ? "创建大纲"
      : create.submitBlockedReason;

  return (
    <button
      type="submit"
      form="dashboard-create-form"
      disabled={disabled}
      title={title}
      className={cn(
        "group relative flex shrink-0 items-center justify-center overflow-hidden border px-4 text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70",
        sidebar ? "h-11 w-full" : "h-10",
        compact ? "hidden min-[480px]:flex" : "flex flex-[1.5]",
        create.canSubmitOutline
          ? "border-zinc-900 bg-[linear-gradient(180deg,#171717,#050505)] text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-24px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,#ffffff,#e9edf1)] dark:text-zinc-950"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-[rewrite-button-shine_1.5s_ease-in-out_infinite]" />
      {create.submitBusy ? (
        <span className="relative flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          创建中
        </span>
      ) : (
        <span className="relative flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          创建大纲
        </span>
      )}
    </button>
  );
}

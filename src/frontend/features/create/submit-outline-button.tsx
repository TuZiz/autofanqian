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
        "inline-flex items-center justify-center gap-2 rounded-full text-sm font-extrabold transition-all active:scale-[0.98] disabled:cursor-not-allowed",
        sidebar ? "h-11 w-full" : "h-10 px-4",
        compact ? "hidden min-[480px]:flex" : "flex flex-[1.5]",
        create.canSubmitOutline
          ? "create-accent text-white shadow-[0_16px_28px_-20px_rgba(20,32,29,0.86)] hover:-translate-y-0.5"
          : "border border-slate-200 bg-slate-100/80 text-slate-400 shadow-none hover:border-slate-300",
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


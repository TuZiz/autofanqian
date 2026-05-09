import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function PrimaryAiButton({
  busy,
  disabled,
  label,
  onClick,
  progress,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  progress: number;
}) {
  const compactLabel = getCompactAiLabel(label, busy, progress);
  const ariaLabel = busy ? `AI 正在生成正文，当前进度 ${progress}%` : label;

  return (
    <button
      type="button"
      aria-busy={busy}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex h-10 max-w-[8rem] shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-bold shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 sm:max-w-[14rem]",
        busy
          ? "cursor-default border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(247,252,249,0.98),rgba(240,249,244,0.94))] text-emerald-800 shadow-sm ring-0 hover:bg-[linear-gradient(180deg,rgba(247,252,249,0.98),rgba(240,249,244,0.94))] disabled:opacity-100 dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(18,40,31,0.55),rgba(15,28,23,0.7))] dark:text-emerald-200 dark:hover:bg-[linear-gradient(180deg,rgba(18,40,31,0.55),rgba(15,28,23,0.7))]"
          : "bg-zinc-950 text-white hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
      )}
    >
      {busy ? (
        <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)] dark:bg-emerald-400 dark:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
      ) : (
        <Sparkles className="relative h-4 w-4 shrink-0" />
      )}
      {busy ? (
        <span className="pointer-events-none absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded-full bg-emerald-100/90 dark:bg-emerald-500/10">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.82),rgba(5,150,105,0.98))] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </span>
      ) : null}
      <span className="relative hidden min-w-0 truncate font-semibold tracking-wide min-[390px]:block">
        {label}
      </span>
      <span className="relative min-w-0 truncate font-semibold tracking-wide min-[390px]:hidden">
        {compactLabel}
      </span>
      {busy ? (
        <span className="relative hidden rounded-lg border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:block">
          {progress}%
        </span>
      ) : null}
    </button>
  );
}

export function SaveStatusPill({
  aiBusy,
  aiLabel,
  aiProgress,
  dirty,
  error,
  metaSaving,
  saving,
  statusText,
}: {
  aiBusy: boolean;
  aiLabel: string;
  aiProgress: number;
  dirty: boolean;
  error: string;
  metaSaving: boolean;
  saving: boolean;
  statusText: string;
}) {
  if (error) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-red-700 shadow-sm dark:bg-red-500/10 dark:text-red-300">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">有错误</span>
      </span>
    );
  }

  if (aiBusy) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(247,252,249,0.98),rgba(240,249,244,0.94))] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(18,40,31,0.55),rgba(15,28,23,0.7))] dark:text-emerald-200">
        <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)] dark:bg-emerald-400 dark:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
        <span className="truncate">{normalizeChapterCopy(aiLabel || `AI生成 ${aiProgress}%`)}</span>
        <span className="rounded-lg border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {aiProgress}%
        </span>
      </span>
    );
  }

  if (saving || metaSaving) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 shadow-sm dark:bg-amber-500/10 dark:text-amber-300">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="truncate">保存中</span>
      </span>
    );
  }

  if (dirty) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-orange-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-orange-700 shadow-sm dark:bg-orange-500/10 dark:text-orange-300">
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">未保存</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{normalizeChapterCopy(statusText)}</span>
    </span>
  );
}

export function normalizeChapterCopy(value: string) {
  const chineseDigits: Record<string, string> = {
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
    十: "10",
  };

  return value
    .replace(/第\s*(\d+)\s*章/g, "第$1章")
    .replace(/第([一二三四五六七八九十])章/g, (_, digit: string) => `第${chineseDigits[digit] ?? digit}章`);
}

function getCompactAiLabel(label: string, busy: boolean, progress: number) {
  if (busy) return `生成中 ${progress}%`;
  if (label.startsWith("先补第")) return label;
  if (label.includes("重新生成第1章")) return "重写第1章";
  if (label.includes("重新生成")) return "重写";
  if (label.includes("AI 生成第1章")) return "生成第1章";
  if (label.includes("AI 生成")) return "生成";
  return label.length > 6 ? label.slice(0, 6) : label;
}

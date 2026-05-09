import { AlertCircle, CheckCircle2 } from "lucide-react";

type StatusTone = "success" | "error" | "muted";

export function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{message}</div>;
}

export function StatusMessage({ error, message }: { error?: string; message?: string }) {
  const tone: StatusTone | null = error ? "error" : message ? "success" : null;
  if (!tone) return null;

  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200";

  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error || message}</span>
    </div>
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

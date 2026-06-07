import { AlertCircle, CheckCircle2 } from "lucide-react";

type StatusTone = "success" | "error" | "muted";

export function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-xs font-medium text-[var(--theme-danger-text)]">{message}</div>;
}

export function StatusMessage({ error, message }: { error?: string; message?: string }) {
  const tone: StatusTone | null = error ? "error" : message ? "success" : null;
  if (!tone) return null;

  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  const className =
    tone === "error"
      ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]"
      : "border-[var(--theme-success-border)] bg-[var(--theme-success-soft)] text-[var(--theme-success-text)]";

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

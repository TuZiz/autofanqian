import { Loader2 } from "lucide-react";

export function WorkLoadingScreen({ label }: { label: string }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--theme-surface-solid)] transition-[background-color,color]">
      <div className="pointer-events-none absolute inset-0 app-noise opacity-[0.02]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[20%] h-[50%] w-[50%] rounded-full bg-[var(--theme-brand-soft)]/10 blur-[120px]" />
        <div className="absolute -right-[10%] top-[40%] h-[40%] w-[40%] rounded-full bg-[var(--theme-brand-subtle)]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-10 text-center shadow-xl backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[var(--theme-text-strong)]">加载中</h2>
          <p className="mt-2 text-sm font-bold text-[var(--theme-text-muted)]">{label}</p>
        </div>
      </div>
    </main>
  );
}

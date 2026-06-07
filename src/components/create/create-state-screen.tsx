"use client";

import { Sparkles } from "lucide-react";

type CreateStateScreenProps = {
  message: string;
  spinning?: boolean;
};

export function CreateStateScreen({ message, spinning = false }: CreateStateScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--theme-bg)] font-sans">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-6 text-center shadow-sm">
        {spinning ? (
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--theme-border)] border-t-[var(--theme-brand-500)]" />
            <Sparkles className="h-4 w-4 text-[var(--theme-brand-text)]" />
          </div>
        ) : null}
        <p className="text-sm font-medium text-[var(--theme-text-secondary)]">{message}</p>
      </div>
    </main>
  );
}

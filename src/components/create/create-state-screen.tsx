"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type CreateStateScreenProps = {
  message: string;
  spinning?: boolean;
};

export function CreateStateScreen({ message, spinning = false }: CreateStateScreenProps) {
  return (
    <main className="app-work-surface relative flex min-h-dvh items-center justify-center overflow-hidden font-sans transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0 z-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 z-0 app-noise theme-app-noise" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-6 text-center shadow-sm"
      >
        {spinning ? (
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--theme-brand-soft)]" />
            <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-[3px] border-transparent border-t-[var(--theme-brand-600)]" />
            <Sparkles className="h-5 w-5 text-[var(--theme-brand-600)]" />
          </div>
        ) : null}
        <p className="animate-pulse text-sm font-bold tracking-tight text-[var(--theme-text-secondary)]">
          {message}
        </p>
      </motion.div>
    </main>
  );
}

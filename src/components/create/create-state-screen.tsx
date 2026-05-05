"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type CreateStateScreenProps = {
  message: string;
  spinning?: boolean;
};

export function CreateStateScreen({ message, spinning = false }: CreateStateScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 font-sans text-zinc-900 transition-colors duration-500 dark:bg-black dark:text-zinc-50">
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[30%] top-[20%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px] mix-blend-multiply dark:bg-blue-600/10" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-6 rounded-[32px] bg-white/60 p-12 shadow-2xl shadow-black/5 ring-1 ring-white/60 backdrop-blur-2xl dark:bg-zinc-900/50 dark:ring-white/10"
      >
        {spinning ? (
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
            <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-[3px] border-transparent border-t-blue-600 dark:border-t-blue-400" />
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        ) : null}
        <p className="animate-pulse text-lg font-bold tracking-tight text-zinc-600 dark:text-zinc-300">
          {message}
        </p>
      </motion.div>
    </main>
  );
}

import { Loader2 } from "lucide-react";

export function WorkLoadingScreen({ label }: { label: string }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-zinc-50 transition-[background-color,color] dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 app-noise opacity-[0.02] dark:opacity-[0.03]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[20%] h-[50%] w-[50%] rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-500/10" />
        <div className="absolute -right-[10%] top-[40%] h-[40%] w-[40%] rounded-full bg-purple-400/10 blur-[120px] dark:bg-purple-500/10" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 rounded-3xl border border-zinc-200/50 bg-white/60 p-10 text-center shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-black text-zinc-950 dark:text-white">加载中</h2>
          <p className="mt-2 text-sm font-bold text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </div>
    </main>
  );
}

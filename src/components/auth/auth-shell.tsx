import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AuthToast } from "@/components/auth/auth-toast";
import { BookOpen } from "lucide-react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  toast?: {
    message: string;
    success: boolean;
  } | null;
};

export function AuthShell({
  title,
  subtitle,
  children,
  toast,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-500">
      
      {/* Hero Glow Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[50%] rounded-full bg-emerald-500/20 dark:bg-emerald-600/20 blur-[120px] mix-blend-multiply" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-purple-500/20 dark:bg-purple-600/20 blur-[120px] mix-blend-multiply" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      
      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle className="rounded-2xl border border-white/20 bg-white/50 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/20" />
      </div>

      {toast && (
        <div className="absolute top-6 z-50 flex w-full justify-center px-4 animate-in slide-in-from-top-4 fade-in duration-500">
          <AuthToast message={toast.message} success={toast.success} />
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6">
        
        <div className="mb-10 text-center animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-white shadow-xl shadow-black/5 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 mb-3">
            {title}
          </h1>
          <p className="text-base md:text-lg font-medium text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto">
            {subtitle}
          </p>
        </div>

        <section className="w-full rounded-[32px] border border-white/40 bg-white/60 p-8 shadow-2xl shadow-black/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/50 sm:p-10 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-150 fill-mode-both">
          {children}
        </section>

      </div>
    </main>
  );
}

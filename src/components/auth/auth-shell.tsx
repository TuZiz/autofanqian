import type { ReactNode } from "react";
import { Feather, Fingerprint, Sparkles, Wand2 } from "lucide-react";

import { AuthToast } from "@/components/auth/auth-toast";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
    <main className="theme-page auth-shell-surface relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f5f6f2] px-4 py-8 transition-[background-color,color] duration-300 dark:bg-[#0d1117] sm:py-10">
      <div className="pointer-events-none absolute inset-0 z-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 z-0 app-noise theme-app-noise" />

      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm backdrop-blur-md hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900" />
      </div>

      {toast ? (
        <div className="absolute top-6 z-50 flex w-full justify-center px-4">
          <AuthToast message={toast.message} success={toast.success} />
        </div>
      ) : null}

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center">
        <div className="mb-7 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
          <div className="theme-chip-brand group relative mb-4 inline-flex items-center justify-center gap-2 rounded-md px-4 py-1.5 backdrop-blur-md transition-all">
            <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-[var(--theme-brand-500)]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              新一代 AI 驱动创作引擎
            </span>
          </div>

          <h1 className="theme-heading mb-3 text-3xl font-black sm:text-4xl">
            我要当作者
          </h1>

          <p className="theme-subheading mx-auto max-w-[360px] text-[13px] font-medium leading-relaxed sm:text-sm">
            打破灵感瓶颈。从大纲推演到流式续写，让 AI 全程护航你的网文世界观。
          </p>
        </div>

        <section className="auth-panel relative w-full rounded-lg px-8 py-9 transition-all sm:px-10 sm:py-10 animate-in fade-in zoom-in-95 duration-700 delay-150 fill-mode-both">
          <div className="absolute inset-x-0 top-0 h-px w-full bg-slate-200/80 dark:bg-slate-800/80" />

          <div className="mb-7 text-center">
            <h2 className="theme-heading text-3xl font-extrabold">{title}</h2>
            <p className="theme-muted mt-2 text-sm">{subtitle}</p>
          </div>

          <div className="relative z-10">{children}</div>
        </section>

        <div className="theme-auth-feature-strip mt-7 flex flex-wrap justify-center gap-4 rounded-lg px-5 py-2.5 text-xs font-bold animate-in fade-in duration-1000 delay-300 fill-mode-both select-none sm:gap-5">
          <span className="group flex cursor-default items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--theme-brand-500)]">
            <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
            智能大纲
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="group flex cursor-default items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--theme-brand-500)]">
            <Feather className="h-4 w-4 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
            流式续写
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="group flex cursor-default items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--theme-brand-500)]">
            <Fingerprint className="h-4 w-4 transition-transform group-hover:scale-110" />
            角色矩阵
          </span>
        </div>
      </div>
    </main>
  );
}

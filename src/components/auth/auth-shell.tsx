import type { ReactNode } from "react";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 text-slate-900 transition-colors dark:bg-[#05070c] dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_12%_12%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_circle_at_88%_18%,rgba(20,184,166,0.14),transparent_55%),linear-gradient(180deg,_#ffffff_0%,_#f1f5f9_55%,_#eef2ff_100%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block app-gradient" />
      <div className="absolute inset-0 hidden dark:block app-vignette" />
      <div className="absolute inset-0 app-noise opacity-[0.06] dark:opacity-[0.12]" />

      {toast ? <AuthToast message={toast.message} success={toast.success} /> : null}

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <section className="glass-panel relative z-10 w-full max-w-md rounded-[28px] p-8 shadow-[0_24px_120px_rgba(2,6,23,0.55)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide">{title}</h1>
          <p className="mt-2 text-sm text-slate-600/90 dark:text-slate-300/80">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

import type { ReactNode } from "react";

import { AuthToast } from "@/components/auth/auth-toast";
import { zhCN } from "@/lib/copy/zh-cn";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  toastMessage?: string;
  toastSuccess?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  children,
  toastMessage,
  toastSuccess,
}: AuthShellProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.28),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#0c1024_0%,#281450_48%,#090d1e_100%)] px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_40%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08)_0,transparent_24%)]" />
      <div className="animate-blob absolute left-[10%] top-[18%] h-72 w-72 rounded-full bg-fuchsia-500/35 blur-3xl" />
      <div className="animate-blob animation-delay-2000 absolute right-[10%] top-[28%] h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
      <div className="animate-blob animation-delay-4000 absolute bottom-[-5rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />

      <AuthToast message={toastMessage} success={toastSuccess} />

      <section className="glass-panel animate-panel-rise relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] p-8 sm:p-9">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-100/60">
            {zhCN.auth.ui.badge}
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-[2.1rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-indigo-100/72">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

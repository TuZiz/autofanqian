import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";

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

export function AuthShell({ children, subtitle, title, toast }: AuthShellProps) {
  return (
    <main className="app-work-surface relative flex min-h-dvh w-full flex-col overflow-hidden font-sans transition-colors duration-300">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle className="h-9 w-9 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] p-2 shadow-sm" />
      </div>

      {toast ? (
        <div className="absolute top-4 z-50 flex w-full justify-center px-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <AuthToast message={toast.message} success={toast.success} />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-5xl items-center gap-6 px-4 py-8 md:grid-cols-[0.86fr_1fr] md:px-6">
        <section className="hidden min-w-0 md:block">
          <div className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-3 text-xs font-bold text-[var(--theme-brand-text)] shadow-sm">
            <BookOpen className="h-4 w-4" />
            小说创作工作台
          </div>
          <h1 className="mt-5 max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-[var(--theme-text-strong)]">
            更快进入写作，少一点等待。
          </h1>
          <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
            登录后直接回到作品、章节和 AI 辅助写作上下文，界面按桌面 100% 缩放优化。
          </p>
        </section>

        <section className="app-compact-panel mx-auto w-full max-w-md p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
                {title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[var(--theme-text-secondary)]">
                {subtitle}
              </p>
            </div>
          </div>
          {children}
        </section>

        <div className="text-center text-xs font-semibold text-[var(--theme-text-muted)] md:hidden">
          {title}
        </div>
      </div>
    </main>
  );
}

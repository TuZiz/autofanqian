"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { apiRequest } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";

type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  isAdmin?: boolean;
};

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await apiRequest<{ user: SessionUser }>(
          "/api/auth/session",
        );

        if (!cancelled && response.success && response.data?.user) {
          setUser(response.data.user);
          setLoading(false);
          return;
        }

        if (!cancelled) {
          window.location.href = "/login";
        }
      } catch {
        if (!cancelled) {
          window.location.href = "/login";
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/logout",
      {},
    );

    if (response.success && response.data?.redirectTo) {
      window.location.href = response.data.redirectTo;
    }
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-700 transition-colors dark:bg-[#05070c] dark:text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_50%_-10%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block app-gradient" />
        <div className="absolute inset-0 hidden dark:block app-vignette" />
        <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />

        <div className="glass-panel relative z-10 flex flex-col items-center gap-4 rounded-3xl p-8">
          <svg
            className="h-8 w-8 animate-spin text-sky-600/70 dark:text-sky-300/70"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="animate-pulse text-sm font-medium text-slate-400">
            正在验证身份信息...
          </p>
        </div>
      </main>
    );
  }

  const verifiedText = user?.emailVerified ? "邮箱已验证" : "邮箱未验证";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-[#05070c] dark:text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_0%,rgba(59,130,246,0.10),transparent_58%),radial-gradient(900px_circle_at_10%_20%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_25%,rgba(20,184,166,0.10),transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#f8fafc_100%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block app-gradient" />
      <div className="absolute inset-0 hidden dark:block app-vignette" />
      <div className="absolute inset-0 app-noise opacity-[0.04] dark:opacity-[0.12]" />

      <header className="relative z-10">
        <div className="sticky top-0 z-50 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#070b14] to-[#05070c] opacity-95" />
          <div className="absolute inset-0 app-noise opacity-[0.18]" />

          <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="leading-tight">
              <div className="text-[11px] tracking-[0.34em] text-slate-400">
                {zhCN.app.shortName}
              </div>
              <div className="text-lg font-semibold text-slate-100">
                创作工作台
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user?.isAdmin ? (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-rose-500/10 transition hover:from-amber-200 hover:via-orange-200 hover:to-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
                >
                  <Shield className="h-4 w-4" />
                  管理员
                </Link>
              ) : null}
              <span className="hidden text-sm text-slate-300/90 sm:inline">
                {user?.email ?? ""}
              </span>
              <ThemeToggle className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" />
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-white/10"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:py-12">
        <div className="glass-panel rounded-[40px] p-10 shadow-2xl lg:p-12">
          <div className="text-sm font-medium text-sky-600 dark:text-sky-300">
            工作台
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            欢迎回来
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300/80">
            这里是受保护的创作工作台。你可以管理作品、大纲与章节，并随时调用 AI 进行灵感拓展、润色与续写。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/create"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/15 transition hover:from-sky-500 hover:to-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:from-sky-400 dark:to-teal-300 dark:text-slate-900 dark:shadow-sky-500/10 dark:focus-visible:ring-offset-[#05070c]"
            >
              开始创作
            </Link>
            <Link
              href="/dashboard/import"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#05070c]"
            >
              导入作品
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              用户 ID
            </div>
            <div className="mt-3 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
              {user?.id ?? ""}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              邮箱地址
            </div>
            <div className="mt-3 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user?.email ?? ""}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              认证状态
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {verifiedText}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

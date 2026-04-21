"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useAuthToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/login",
      { email, password },
    );

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      window.setTimeout(() => {
        window.location.href = response.data!.redirectTo;
      }, 500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "登录失败，请稍后重试。", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell
      title="BayData 控制台"
      subtitle="请输入您的邮箱与密码登录系统"
      toast={toast}
    >
      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
        <div>
          <label className="mb-1 block pl-1 text-sm font-medium text-slate-700 dark:text-white/90">
            电子邮箱
          </label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            required
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
            placeholder="admin@example.com"
          />
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.email ?? ""}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between pl-1 pr-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-white/90">
              密码
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              忘记密码？
            </Link>
          </div>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
            placeholder="请输入密码"
          />
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.password ?? ""}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-xl border border-sky-300/25 bg-gradient-to-r from-sky-500 to-teal-400 py-3 font-medium text-white shadow-lg shadow-sky-950/40 transition-all duration-300 hover:from-sky-400 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "登录中..." : "登 录"}
        </button>

        <div className="mt-4 text-center text-sm text-slate-600/90 dark:text-slate-300/80">
          还没有账号？{" "}
          <Link
            href="/register"
            className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-white"
          >
            立即注册
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

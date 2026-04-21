"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";

type LoginResponse = {
  redirectTo: string;
};

export function LoginForm() {
  const router = useRouter();
  const { toast, showToast } = useAuthToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const response = await apiRequest<LoginResponse>("/api/auth/login", {
      email,
      password,
    });

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      router.replace(response.data.redirectTo);
      router.refresh();
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || zhCN.auth.ui.login.failureFallback, false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell
      title={zhCN.auth.ui.login.title}
      subtitle={zhCN.auth.ui.login.subtitle}
      toastMessage={toast?.message}
      toastSuccess={toast?.success}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="email"
          >
            {zhCN.auth.ui.login.emailLabel}
          </label>
          <div className="glass-field">
            <input
              autoComplete="email"
              className="glass-input"
              id="email"
              name="email"
              placeholder={zhCN.auth.ui.login.emailPlaceholder}
              required
              type="email"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.email ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <label
              className="block text-sm font-medium text-white/90"
              htmlFor="password"
            >
              {zhCN.auth.ui.login.passwordLabel}
            </label>
            <Link
              className="text-xs text-indigo-100/75 transition hover:text-white"
              href="/forgot-password"
            >
              {zhCN.auth.ui.login.forgotPassword}
            </Link>
          </div>
          <div className="glass-field">
            <input
              autoComplete="current-password"
              className="glass-input"
              id="password"
              name="password"
              placeholder={zhCN.auth.ui.login.passwordPlaceholder}
              required
              type="password"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.password ?? ""}
          </p>
        </div>

        <button
          className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-indigo-300/35 bg-gradient-to-r from-indigo-500/85 to-sky-500/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(59,130,246,0.36)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? zhCN.auth.ui.login.submitting : zhCN.auth.ui.login.submit}
        </button>

        <p className="pt-2 text-center text-sm text-indigo-100/72">
          {zhCN.auth.ui.login.noAccount}
          <Link
            className="ml-1 font-medium text-cyan-200 transition hover:text-white"
            href="/register"
          >
            {zhCN.auth.ui.login.goRegister}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

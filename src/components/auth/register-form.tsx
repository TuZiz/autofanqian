"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";
import { zhCN } from "@/lib/copy/zh-cn";

type SendCodeResponse = {
  resendAfterSeconds: number;
};

type RegisterResponse = {
  redirectTo: string;
};

export function RegisterForm() {
  const router = useRouter();
  const { toast, showToast } = useAuthToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    setFieldErrors((current) => ({ ...current, email: "" }));
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value.trim() ?? "";

    if (!email) {
      showToast(zhCN.auth.ui.register.needEmailFirst, false);
      setFieldErrors((current) => ({
        ...current,
        email: zhCN.auth.validation.emailRequired,
      }));
      return;
    }

    setIsSendingCode(true);
    const response = await apiRequest<SendCodeResponse>(
      "/api/auth/register/send-code",
      { email }
    );

    if (response.success) {
      showToast(response.message, true);
      setCountdown(response.data?.resendAfterSeconds ?? 60);
    } else {
      setFieldErrors(firstFieldErrors(response.fieldErrors));
      showToast(response.message || "验证码发送失败。", false);
    }

    setIsSendingCode(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setFieldErrors({
        confirmPassword: zhCN.auth.error.passwordConfirmMismatch,
      });
      showToast(zhCN.auth.error.passwordConfirmMismatch, false);
      setIsSubmitting(false);
      return;
    }

    const response = await apiRequest<RegisterResponse>(
      "/api/auth/register/confirm",
      {
        email,
        code,
        password,
      }
    );

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      router.replace(response.data.redirectTo);
      router.refresh();
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || zhCN.auth.ui.register.failureFallback, false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell
      title={zhCN.auth.ui.register.title}
      subtitle={zhCN.auth.ui.register.subtitle}
      toastMessage={toast?.message}
      toastSuccess={toast?.success}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="email"
          >
            {zhCN.auth.ui.register.emailLabel}
          </label>
          <div className="flex gap-2">
            <div className="glass-field flex-1">
              <input
                autoComplete="email"
                className="glass-input"
                id="email"
                name="email"
                placeholder={zhCN.auth.ui.register.emailPlaceholder}
                required
                type="email"
              />
            </div>
            <button
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSendingCode || countdown > 0}
              type="button"
              onClick={handleSendCode}
            >
              {isSendingCode
                ? zhCN.auth.ui.register.sendingCode
                : countdown > 0
                  ? `${countdown}s 后重发`
                  : zhCN.auth.ui.register.sendCode}
            </button>
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.email ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="code"
          >
            {zhCN.auth.ui.register.codeLabel}
          </label>
          <div className="glass-field">
            <input
              className="glass-input tracking-[0.4em]"
              id="code"
              inputMode="numeric"
              maxLength={6}
              name="code"
              pattern="\d{6}"
              placeholder={zhCN.auth.ui.register.codePlaceholder}
              required
              type="text"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.code ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="password"
          >
            {zhCN.auth.ui.register.passwordLabel}
          </label>
          <div className="glass-field">
            <input
              autoComplete="new-password"
              className="glass-input"
              id="password"
              name="password"
              placeholder={zhCN.auth.ui.register.passwordPlaceholder}
              required
              type="password"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.password ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="confirmPassword"
          >
            {zhCN.auth.ui.register.confirmPasswordLabel}
          </label>
          <div className="glass-field">
            <input
              autoComplete="new-password"
              className="glass-input"
              id="confirmPassword"
              name="confirmPassword"
              placeholder={zhCN.auth.ui.register.confirmPasswordPlaceholder}
              required
              type="password"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.confirmPassword ?? ""}
          </p>
        </div>

        <button
          className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-indigo-300/35 bg-gradient-to-r from-indigo-500/85 to-sky-500/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(59,130,246,0.36)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? zhCN.auth.ui.register.submitting
            : zhCN.auth.ui.register.submit}
        </button>

        <p className="pt-2 text-center text-sm text-indigo-100/72">
          {zhCN.auth.ui.register.hasAccount}
          <Link
            className="ml-1 font-medium text-cyan-200 transition hover:text-white"
            href="/login"
          >
            {zhCN.auth.ui.register.backToLogin}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

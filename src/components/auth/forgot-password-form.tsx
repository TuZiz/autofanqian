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

type ResetResponse = {
  redirectTo: string;
};

export function ForgotPasswordForm() {
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
      showToast(zhCN.auth.ui.forgotPassword.needEmailFirst, false);
      setFieldErrors((current) => ({
        ...current,
        email: zhCN.auth.validation.emailRequired,
      }));
      return;
    }

    setIsSendingCode(true);
    const response = await apiRequest<SendCodeResponse>(
      "/api/auth/password/send-code",
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
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setFieldErrors({
        confirmPassword: zhCN.auth.error.passwordConfirmMismatch,
      });
      showToast(zhCN.auth.error.passwordConfirmMismatch, false);
      setIsSubmitting(false);
      return;
    }

    const response = await apiRequest<ResetResponse>(
      "/api/auth/password/reset",
      {
        email,
        code,
        newPassword,
      }
    );

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      router.replace(response.data.redirectTo);
      router.refresh();
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(
      response.message || zhCN.auth.ui.forgotPassword.failureFallback,
      false
    );
    setIsSubmitting(false);
  }

  return (
    <AuthShell
      title={zhCN.auth.ui.forgotPassword.title}
      subtitle={zhCN.auth.ui.forgotPassword.subtitle}
      toastMessage={toast?.message}
      toastSuccess={toast?.success}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="email"
          >
            {zhCN.auth.ui.forgotPassword.emailLabel}
          </label>
          <div className="flex gap-2">
            <div className="glass-field flex-1">
              <input
                autoComplete="email"
                className="glass-input"
                id="email"
                name="email"
                placeholder={zhCN.auth.ui.forgotPassword.emailPlaceholder}
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
                ? zhCN.auth.ui.forgotPassword.sendingCode
                : countdown > 0
                  ? `${countdown}s 后重发`
                  : zhCN.auth.ui.forgotPassword.sendCode}
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
            {zhCN.auth.ui.forgotPassword.codeLabel}
          </label>
          <div className="glass-field">
            <input
              className="glass-input tracking-[0.4em]"
              id="code"
              inputMode="numeric"
              maxLength={6}
              name="code"
              pattern="\d{6}"
              placeholder={zhCN.auth.ui.forgotPassword.codePlaceholder}
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
            htmlFor="newPassword"
          >
            {zhCN.auth.ui.forgotPassword.newPasswordLabel}
          </label>
          <div className="glass-field">
            <input
              autoComplete="new-password"
              className="glass-input"
              id="newPassword"
              name="newPassword"
              placeholder={zhCN.auth.ui.forgotPassword.newPasswordPlaceholder}
              required
              type="password"
            />
          </div>
          <p className="min-h-5 pl-1 text-xs text-pink-300">
            {fieldErrors.newPassword ?? ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            className="block pl-1 text-sm font-medium text-white/90"
            htmlFor="confirmPassword"
          >
            {zhCN.auth.ui.forgotPassword.confirmPasswordLabel}
          </label>
          <div className="glass-field">
            <input
              autoComplete="new-password"
              className="glass-input"
              id="confirmPassword"
              name="confirmPassword"
              placeholder={
                zhCN.auth.ui.forgotPassword.confirmPasswordPlaceholder
              }
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
            ? zhCN.auth.ui.forgotPassword.submitting
            : zhCN.auth.ui.forgotPassword.submit}
        </button>

        <p className="pt-2 text-center text-sm text-indigo-100/72">
          {zhCN.auth.ui.forgotPassword.rememberPassword}
          <Link
            className="ml-1 font-medium text-cyan-200 transition hover:text-white"
            href="/login"
          >
            {zhCN.auth.ui.forgotPassword.backToLogin}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

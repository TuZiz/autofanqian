"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Lock, Mail } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordVisibilityToggle } from "@/components/auth/password-visibility-toggle";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const { toast, showToast } = useAuthToast();
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  function startCountdown(seconds: number) {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    setCountdown(seconds);
    timerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
          }
          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    const formEmail = formRef.current
      ? String(new FormData(formRef.current).get("email") ?? "")
      : email;
    const currentEmail = (formEmail || email).trim();

    if (!currentEmail) {
      showToast("请先输入注册邮箱。", false);
      return;
    }

    if (currentEmail !== email) {
      setEmail(currentEmail);
    }

    setIsSendingCode(true);
    setFieldErrors({});

    const response = await apiRequest<{ resendAfterSeconds?: number }>(
      "/api/auth/password/send-code",
      { email: currentEmail },
    );

    if (response.success) {
      showToast(response.message, true);
      startCountdown(response.data?.resendAfterSeconds || 60);
    } else {
      setFieldErrors(firstFieldErrors(response.fieldErrors));
      showToast(response.message, false);
    }

    setIsSendingCode(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim() || email.trim();
    const submittedCode =
      String(formData.get("verificationCode") ?? "").trim() || code.trim();
    const submittedNewPassword =
      String(formData.get("newPassword") ?? "") || newPassword;
    const submittedConfirmPassword =
      String(formData.get("confirmNewPassword") ?? "") || confirmPassword;

    if (submittedEmail && submittedEmail !== email) {
      setEmail(submittedEmail);
    }
    if (submittedCode && submittedCode !== code) {
      setCode(submittedCode);
    }
    if (submittedNewPassword && submittedNewPassword !== newPassword) {
      setNewPassword(submittedNewPassword);
    }
    if (submittedConfirmPassword && submittedConfirmPassword !== confirmPassword) {
      setConfirmPassword(submittedConfirmPassword);
    }

    if (submittedNewPassword !== submittedConfirmPassword) {
      setFieldErrors({ confirmPassword: "两次输入的密码不一致。" });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/password/reset",
      {
        email: submittedEmail,
        code: submittedCode,
        newPassword: submittedNewPassword,
      },
    );

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      const redirectTo = response.data.redirectTo;
      window.setTimeout(() => {
        router.replace(redirectTo);
      }, 500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "重置失败，请稍后重试。", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="重置密码" subtitle="通过邮箱验证找回您的账号" toast={toast}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
        autoComplete="off"
      >
        <div>
          <label className="theme-field-label mb-1 block pl-1 text-sm font-bold">
            注册邮箱
          </label>
          <div className="theme-field-shell group flex w-full overflow-hidden rounded-lg backdrop-blur-md">
            <div className="theme-field-prefix flex w-12 items-center justify-center">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="theme-field-input min-w-0 flex-1 px-4 py-3 text-sm focus:outline-none"
              placeholder="请输入你的邮箱"
            />
          </div>
          {fieldErrors.email ? (
            <p className="mt-2 pl-1 text-xs font-medium text-rose-500">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label className="theme-field-label mb-1 block pl-1 text-sm font-bold">
            验证码
          </label>
          <div className="theme-field-shell group flex w-full overflow-hidden rounded-lg backdrop-blur-md">
            <div className="theme-field-prefix flex w-12 items-center justify-center">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="verificationCode"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              className="theme-field-input min-w-0 flex-1 px-4 py-3 text-sm focus:outline-none"
              placeholder="6 位数字"
            />
            <button
              type="button"
              disabled={isSendingCode || countdown > 0}
              onClick={handleSendCode}
              className="theme-field-code-action whitespace-nowrap px-4 text-sm font-bold"
            >
              {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s 后重发` : "发送验证码"}
            </button>
          </div>
          {fieldErrors.code ? (
            <p className="mt-2 pl-1 text-xs font-medium text-rose-500">
              {fieldErrors.code}
            </p>
          ) : null}
        </div>

        <div>
          <label className="theme-field-label mb-1 block pl-1 text-sm font-bold">
            新密码
          </label>
          <div className="theme-field-shell group flex w-full overflow-hidden rounded-lg backdrop-blur-md">
            <div className="theme-field-prefix flex w-12 items-center justify-center">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type={newPasswordVisible ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              className="theme-field-input min-w-0 flex-1 px-4 py-3 text-sm focus:outline-none"
              placeholder="输入新密码"
            />
            <PasswordVisibilityToggle
              visible={newPasswordVisible}
              onToggle={() => setNewPasswordVisible((current) => !current)}
            />
          </div>
          {fieldErrors.newPassword ? (
            <p className="mt-2 pl-1 text-xs font-medium text-rose-500">
              {fieldErrors.newPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label className="theme-field-label mb-1 block pl-1 text-sm font-bold">
            确认新密码
          </label>
          <div className="theme-field-shell group flex w-full overflow-hidden rounded-lg backdrop-blur-md">
            <div className="theme-field-prefix flex w-12 items-center justify-center">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type={confirmPasswordVisible ? "text" : "password"}
              name="confirmNewPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="theme-field-input min-w-0 flex-1 px-4 py-3 text-sm focus:outline-none"
              placeholder="再次输入密码"
            />
            <PasswordVisibilityToggle
              visible={confirmPasswordVisible}
              onToggle={() => setConfirmPasswordVisible((current) => !current)}
            />
          </div>
          {fieldErrors.confirmPassword ? (
            <p className="mt-2 pl-1 text-xs font-medium text-rose-500">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="theme-button-primary w-full rounded-lg py-3 text-sm font-bold tracking-wide active:scale-95"
        >
          {isSubmitting ? "处理中..." : "重置密码"}
        </button>

        <div className="theme-muted -mt-1 text-center text-sm font-medium">
          记起密码了？{" "}
          <Link href="/login" className="theme-link font-bold">
            返回登录
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

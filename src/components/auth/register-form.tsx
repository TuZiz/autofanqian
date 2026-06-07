"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordVisibilityToggle } from "@/components/auth/password-visibility-toggle";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      showToast("请先输入电子邮箱。", false);
      return;
    }

    if (currentEmail !== email) {
      setEmail(currentEmail);
    }

    setIsSendingCode(true);
    setFieldErrors({});

    const response = await apiRequest<{ resendAfterSeconds?: number }>(
      "/api/auth/register/send-code",
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
    if (isSubmitting) return;
    event.preventDefault();

    if (password !== confirmPassword) {
      const message = "两次输入的密码不一致。";
      setFieldErrors({ confirmPassword: message });
      showToast(message, false);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/register/confirm",
      {
        email,
        code,
        password,
      },
    );

    if (response.success) {
      showToast(response.message, true);
      setIsSubmitting(false);
      window.setTimeout(() => {
        router.replace(response.data?.redirectTo || "/dashboard");
      }, 1500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "注册失败，请稍后重试", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="创建创作者账号" subtitle="开启您的智能写作之旅" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">

        <div>
          <label htmlFor="register-email" className="mb-2 block pl-1 text-sm font-bold text-[var(--theme-text-secondary)]">
            邮箱地址
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20">
            <span className="flex w-14 items-center justify-center text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-brand-500)] transition-colors">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="请输入邮箱地址"
            />
          </div>
          {fieldErrors.email ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-email-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.email}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-code" className="mb-2 block pl-1 text-sm font-bold text-[var(--theme-text-secondary)]">
            验证码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20">
            <span className="flex w-14 items-center justify-center text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-brand-500)] transition-colors">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="register-code"
              type="text"
              name="verificationCode"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              aria-invalid={!!fieldErrors.code}
              aria-describedby={fieldErrors.code ? "register-code-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="6位数字"
            />
            <div className="flex items-center pr-2">
              <button
                type="button"
                disabled={isSendingCode || countdown > 0}
                onClick={handleSendCode}
                className="h-8 rounded-md px-3 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-surface-hover)] disabled:pointer-events-none disabled:opacity-50"
              >
                {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
              </button>
            </div>
          </div>
          {fieldErrors.code ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-code-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.code}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block pl-1 text-sm font-bold text-[var(--theme-text-secondary)]">
            设置密码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20">
            <span className="flex w-14 items-center justify-center text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-brand-500)] transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="register-password"
              type={passwordVisible ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="至少6位密码"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((current) => !current)}
              />
            </div>
          </div>
          {fieldErrors.password ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-password-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.password}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-2 block pl-1 text-sm font-bold text-[var(--theme-text-secondary)]">
            确认密码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20">
            <span className="flex w-14 items-center justify-center text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-brand-500)] transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="register-confirm-password"
              type={confirmPasswordVisible ? "text" : "password"}
              name="confirmNewPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="再次输入密码"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={confirmPasswordVisible}
                onToggle={() => setConfirmPasswordVisible((current) => !current)}
              />
            </div>
          </div>
          {fieldErrors.confirmPassword ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-confirm-password-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.confirmPassword}
            </motion.p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="relative mt-2 w-full overflow-hidden rounded-lg bg-[var(--theme-brand-500)] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--theme-brand-600)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              注册中...
            </span>
          ) : (
            "创 建 账 号"
          )}
        </button>

        <div className="mt-2 text-center text-sm font-medium text-[var(--theme-text-muted)]">
          已有账号？{" "}
          <Link href="/login" className="font-bold text-[var(--theme-text-strong)] hover:text-[var(--theme-brand-600)] transition-colors">
            返回登录
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

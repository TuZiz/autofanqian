"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { InputGroupRoot, InputGroupPrefix, InputGroupInput, Button } from "@heroui/react";

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
    if (isSubmitting) return;
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      const message = "两次输入的密码不一致。";
      setFieldErrors({ confirmPassword: message });
      showToast(message, false);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>(
      "/api/auth/password/reset",
      {
        email,
        code,
        newPassword,
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
    showToast(response.message || "重置失败，请检查输入后重试", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="找回密码" subtitle="安全验证并重置访问密码" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">

        <div>
          <label htmlFor="forgot-email" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            邮箱地址
          </label>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "forgot-email-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="请输入邮箱地址"
            />
          </InputGroupRoot>
          {fieldErrors.email ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="forgot-email-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.email}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="forgot-code" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            验证码
          </label>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="forgot-code"
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
              aria-describedby={fieldErrors.code ? "forgot-code-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="6位数字"
            />
            <div className="flex items-center pr-2">
              <Button
                type="button"
                isDisabled={isSendingCode || countdown > 0}
                onPress={handleSendCode}
                className="h-8 rounded-md px-3 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200/50 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
              </Button>
            </div>
          </InputGroupRoot>
          {fieldErrors.code ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="forgot-code-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.code}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="forgot-new-password" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            新密码
          </label>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="forgot-new-password"
              type={newPasswordVisible ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              aria-invalid={!!fieldErrors.newPassword}
              aria-describedby={fieldErrors.newPassword ? "forgot-new-password-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="至少6位密码"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={newPasswordVisible}
                onToggle={() => setNewPasswordVisible((current) => !current)}
              />
            </div>
          </InputGroupRoot>
          {fieldErrors.newPassword ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="forgot-new-password-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.newPassword}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="forgot-confirm-password" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            确认新密码
          </label>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="forgot-confirm-password"
              type={confirmPasswordVisible ? "text" : "password"}
              name="confirmNewPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? "forgot-confirm-password-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="再次输入密码"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={confirmPasswordVisible}
                onToggle={() => setConfirmPasswordVisible((current) => !current)}
              />
            </div>
          </InputGroupRoot>
          {fieldErrors.confirmPassword ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="forgot-confirm-password-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.confirmPassword}
            </motion.p>
          ) : null}
        </div>

        <Button
          type="submit"
          isDisabled={isSubmitting}
          className="relative mt-2 w-full overflow-hidden rounded-lg bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70 dark:bg-white dark:text-zinc-950"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
              处理中...
            </span>
          ) : (
            "重 置 密 码"
          )}
        </Button>

        <div className="mt-2 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
          记起密码了？{" "}
          <Link href="/login" className="font-bold text-zinc-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors">
            返回登录
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

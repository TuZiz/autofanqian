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

    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest("/api/auth/register", {
      email,
      verificationCode: code,
      newPassword: password,
      confirmNewPassword: confirmPassword,
    });

    if (response.success) {
      showToast(response.message, true);
      setIsSubmitting(false);
      window.setTimeout(() => {
        router.replace("/login");
      }, 1500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "注册失败，请稍后重试", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="创建创作者账号" subtitle="开启您的智能写作之旅" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" autoComplete="off">
        
        <div>
          <label htmlFor="register-email" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            邮箱地址
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 backdrop-blur-md">
            <div className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-blue-500 transition-colors">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
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
              className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="hello@example.com"
            />
          </div>
          {fieldErrors.email ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-email-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.email}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-code" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            验证码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 backdrop-blur-md">
            <div className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-blue-500 transition-colors">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
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
              className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="6位数字"
            />
            <div className="flex items-center pr-2">
              <button
                type="button"
                disabled={isSendingCode || countdown > 0}
                onClick={handleSendCode}
                className="h-10 rounded-xl px-4 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200/50 disabled:pointer-events-none disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isSendingCode ? "发送中..." : countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
              </button>
            </div>
          </div>
          {fieldErrors.code ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-code-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.code}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            设置密码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 backdrop-blur-md">
            <div className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-blue-500 transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
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
              className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white pr-12"
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
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-password-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.password}
            </motion.p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            确认密码
          </label>
          <div className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 backdrop-blur-md">
            <div className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-blue-500 transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
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
              className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white pr-12"
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
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="register-confirm-password-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.confirmPassword}
            </motion.p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 relative w-full overflow-hidden rounded-2xl bg-zinc-900 px-4 py-4 text-base font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:scale-[1.02] hover:shadow-zinc-900/30 active:scale-95 disabled:pointer-events-none disabled:opacity-70 dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:shadow-white/20"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
              注册中...
            </span>
          ) : (
            "创 建 账 号"
          )}
        </button>

        <div className="mt-2 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
          已有账号？{" "}
          <Link href="/login" className="font-bold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors">
            返回登录
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

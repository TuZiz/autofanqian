"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<number | null>(null);
  const { toast, showToast } = useAuthToast();

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
    if (!email) {
      showToast("请先输入注册邮箱。", false);
      return;
    }

    setIsSendingCode(true);
    setFieldErrors({});

    const response = await apiRequest<{ resendAfterSeconds?: number }>(
      "/api/auth/password/send-code",
      { email },
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
      { email, code, newPassword },
    );

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      window.setTimeout(() => {
        window.location.href = response.data!.redirectTo;
      }, 500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "重置失败，请稍后重试。", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell
      title="找回密码"
      subtitle="通过验证邮箱重置您的密码"
      toast={toast}
    >
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="mb-1 block pl-1 text-sm font-medium text-slate-700 dark:text-white/90">
            注册邮箱
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              required
              className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
              placeholder="输入邮箱"
            />
            <button
              type="button"
              disabled={isSendingCode || countdown > 0}
              onClick={handleSendCode}
              className="whitespace-nowrap rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            >
              {isSendingCode
                ? "发送中..."
                : countdown > 0
                  ? `${countdown}s 后重发`
                  : "发送验证码"}
            </button>
          </div>
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.email ?? ""}
          </p>
        </div>

        <div>
          <label className="mb-1 block pl-1 text-sm font-medium text-slate-700 dark:text-white/90">
            验证码
          </label>
          <input
            type="text"
            name="verificationCode"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
            placeholder="6 位数字验证码"
          />
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.code ?? ""}
          </p>
        </div>

        <div>
          <label className="mb-1 block pl-1 text-sm font-medium text-slate-700 dark:text-white/90">
            新密码
          </label>
          <input
            type="password"
            name="newPassword"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
            placeholder="输入新密码"
          />
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.newPassword ?? ""}
          </p>
        </div>

        <div>
          <label className="mb-1 block pl-1 text-sm font-medium text-slate-700 dark:text-white/90">
            确认新密码
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-sky-400/50"
            placeholder="再次输入新密码"
          />
          <p className="mt-1 pl-1 text-xs text-pink-400">
            {fieldErrors.confirmPassword ?? ""}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-xl border border-sky-300/25 bg-gradient-to-r from-sky-500 to-teal-400 py-3 font-medium text-white shadow-lg shadow-sky-950/40 transition-all duration-300 hover:from-sky-400 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "处理中..." : "重 置 密 码"}
        </button>

        <div className="mt-4 text-center text-sm text-slate-600/90 dark:text-slate-300/80">
          记起密码了？{" "}
          <Link
            href="/login"
            className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-white"
          >
            返回登录
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

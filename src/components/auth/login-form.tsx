"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordVisibilityToggle } from "@/components/auth/password-visibility-toggle";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "checking" | "success";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const { toast, showToast } = useAuthToast();
  const router = useRouter();
  const isSubmitting = submitState === "checking";
  const isBusy = submitState !== "idle";
  const hasCredentialError = !!formError;
  const hasEmailError = !!fieldErrors.email || hasCredentialError;
  const hasPasswordError = !!fieldErrors.password || hasCredentialError;
  const passwordDescriptionIds = [
    fieldErrors.password ? "login-password-error" : "",
    formError ? "login-form-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function clearFieldError(field: "email" | "password") {
    setFormError("");
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setSubmitState("checking");
    setFieldErrors({});
    setFormError("");

    const response = await apiRequest<{ redirectTo: string }>("/api/auth/login", {
      email,
      password,
    });

    if (response.success && response.data?.redirectTo) {
      setSubmitState("success");
      showToast(response.message || "登录成功，正在进入工作台。", true);
      const redirectTo = response.data.redirectTo;
      window.setTimeout(() => {
        router.replace(redirectTo);
      }, 260);
      return;
    }

    const nextFieldErrors = firstFieldErrors(response.fieldErrors);
    const isSharedCredentialError =
      response.status === 401 &&
      nextFieldErrors.email &&
      nextFieldErrors.password &&
      nextFieldErrors.email === nextFieldErrors.password;

    if (isSharedCredentialError) {
      setFieldErrors({});
      setFormError("邮箱或密码错误，请重点检查访问密码。");
    } else {
      setFieldErrors(nextFieldErrors);
      setFormError(Object.keys(nextFieldErrors).length ? "" : response.message || "登录失败，请稍后重试。");
    }
    showToast(response.message || "登录失败，请稍后重试。", false);
    setSubmitState("idle");
  }

  return (
    <AuthShell title="欢迎回来" subtitle="登录您的创作者工作台" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="on">

        <div>
          <label htmlFor="login-email" className="mb-2 block pl-1 text-sm font-bold text-[var(--theme-text-secondary)]">
            邮箱地址
          </label>
          <div
            className={cn(
              "group relative flex w-full overflow-hidden rounded-xl border bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20",
              hasEmailError
                ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] ring-2 ring-[var(--theme-danger-text)]/15 focus-within:border-[var(--theme-danger-border)] focus-within:ring-[var(--theme-danger-text)]/20"
                : "border-[var(--theme-border)]"
            )}
          >
            <span
              className={cn(
                "flex w-14 items-center justify-center text-[var(--theme-text-muted)] transition-colors group-focus-within:text-[var(--theme-brand-500)]",
                hasEmailError && "text-[var(--theme-danger-text)] group-focus-within:text-[var(--theme-danger-text)]"
              )}
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError("email");
              }}
              required
              aria-invalid={hasEmailError}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="请输入邮箱地址"
            />
          </div>
          {fieldErrors.email ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="login-email-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.email}
            </motion.p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <label htmlFor="login-password" className="block text-sm font-bold text-[var(--theme-text-secondary)]">访问密码</label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-[var(--theme-brand-600)] hover:text-[var(--theme-brand-500)] transition-colors"
            >
              忘记密码？
            </Link>
          </div>
          <div
            className={cn(
              "group relative flex w-full overflow-hidden rounded-xl border bg-[var(--theme-surface-solid)] transition-all focus-within:border-[var(--theme-brand-border)] focus-within:ring-2 focus-within:ring-[var(--theme-brand-500)]/20",
              hasPasswordError
                ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] ring-2 ring-[var(--theme-danger-text)]/15 focus-within:border-[var(--theme-danger-border)] focus-within:ring-[var(--theme-danger-text)]/20"
                : "border-[var(--theme-border)]"
            )}
          >
            <span
              className={cn(
                "flex w-14 items-center justify-center text-[var(--theme-text-muted)] transition-colors group-focus-within:text-[var(--theme-brand-500)]",
                hasPasswordError && "text-[var(--theme-danger-text)] group-focus-within:text-[var(--theme-danger-text)]"
              )}
            >
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
              required
              aria-invalid={hasPasswordError}
              aria-describedby={passwordDescriptionIds || undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none"
              placeholder="请输入访问密码"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((current) => !current)}
              />
            </div>
          </div>
          {fieldErrors.password ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="login-password-error" className="mt-2 pl-1 text-sm font-semibold text-[var(--theme-danger-text)]" role="alert">
              {fieldErrors.password}
            </motion.p>
          ) : null}
          {formError ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              id="login-form-error"
              className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] px-3 py-2 text-sm font-black leading-5 text-[var(--theme-danger-text)]"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </motion.div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className={cn(
            "relative mt-2 w-full overflow-hidden rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-85",
            submitState === "success"
              ? "bg-[var(--theme-success-text)]"
              : "bg-[var(--theme-brand-500)] hover:bg-[var(--theme-brand-600)]"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              正在核对账号...
            </span>
          ) : submitState === "success" ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              登录成功，进入工作台
            </span>
          ) : (
            "登 录"
          )}
        </button>

        <div className="mt-2 text-center text-sm font-medium text-[var(--theme-text-muted)]">
          还没有创作者账号？{" "}
          <Link href="/register" className="font-bold text-[var(--theme-text-strong)] hover:text-[var(--theme-brand-600)] transition-colors">
            立即注册
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

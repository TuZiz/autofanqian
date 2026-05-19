"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { InputGroupRoot, InputGroupPrefix, InputGroupInput, Button } from "@heroui/react";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordVisibilityToggle } from "@/components/auth/password-visibility-toggle";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { apiRequest, firstFieldErrors } from "@/lib/client/auth-api";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useAuthToast();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isSubmitting) return;
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>("/api/auth/login", {
      email,
      password,
    });

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      setIsSubmitting(false);
      const redirectTo = response.data.redirectTo;
      window.setTimeout(() => {
        router.replace(redirectTo);
      }, 500);
      return;
    }

    const nextFieldErrors = firstFieldErrors(response.fieldErrors);
    const isSharedCredentialError =
      response.status === 401 &&
      nextFieldErrors.email &&
      nextFieldErrors.password &&
      nextFieldErrors.email === nextFieldErrors.password;

    setFieldErrors(isSharedCredentialError ? {} : nextFieldErrors);
    showToast(response.message || "登录失败，请稍后重试。", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="欢迎回来" subtitle="登录您的创作者工作台" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="on">

        <div>
          <label htmlFor="login-email" className="mb-2 block pl-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            邮箱地址
          </label>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="请输入邮箱地址"
            />
          </InputGroupRoot>
          {fieldErrors.email ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="login-email-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.email}
            </motion.p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <label htmlFor="login-password" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">访问密码</label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              忘记密码？
            </Link>
          </div>
          <InputGroupRoot className="group relative flex w-full overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-black/40 border border-transparent focus-within:border-emerald-500/50 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300 backdrop-blur-md">
            <InputGroupPrefix className="flex w-14 items-center justify-center text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </InputGroupPrefix>
            <InputGroupInput
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 pr-12 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
              placeholder="••••••••"
            />
            <div className="absolute right-2 top-0 h-full flex items-center">
              <PasswordVisibilityToggle
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((current) => !current)}
              />
            </div>
          </InputGroupRoot>
          {fieldErrors.password ? (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} id="login-password-error" className="mt-2 pl-1 text-sm font-semibold text-red-500" role="alert">
              {fieldErrors.password}
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
              验证中...
            </span>
          ) : (
            "登 录"
          )}
        </Button>

        <div className="mt-2 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
          还没有创作者账号？{" "}
          <Link href="/register" className="font-bold text-zinc-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors">
            立即注册
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

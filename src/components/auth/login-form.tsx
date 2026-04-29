"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";

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
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const response = await apiRequest<{ redirectTo: string }>("/api/auth/login", {
      email,
      password,
    });

    if (response.success && response.data?.redirectTo) {
      showToast(response.message, true);
      const redirectTo = response.data.redirectTo;
      window.setTimeout(() => {
        router.replace(redirectTo);
      }, 500);
      return;
    }

    setFieldErrors(firstFieldErrors(response.fieldErrors));
    showToast(response.message || "登录失败，请稍后重试。", false);
    setIsSubmitting(false);
  }

  return (
    <AuthShell title="登录工作台" subtitle="验证您的创作者身份" toast={toast}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="on">
        <div>
          <label className="theme-field-label mb-1 block pl-1 text-sm font-bold">
            作者邮箱
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
          <div className="mb-1 flex items-center justify-between gap-3 px-1">
            <label className="theme-field-label block text-sm font-bold">访问密码</label>
            <Link
              href="/forgot-password"
              className="theme-link shrink-0 text-xs font-semibold leading-none transition-colors"
            >
              忘记密码？
            </Link>
          </div>
          <div className="theme-field-shell group flex w-full overflow-hidden rounded-lg backdrop-blur-md">
            <div className="theme-field-prefix flex w-12 items-center justify-center">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type={passwordVisible ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="theme-field-input min-w-0 flex-1 px-4 py-3 text-sm focus:outline-none"
              placeholder="请输入密码"
            />
            <PasswordVisibilityToggle
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((current) => !current)}
            />
          </div>
          {fieldErrors.password ? (
            <p className="mt-2 pl-1 text-xs font-medium text-rose-500">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="theme-button-primary w-full rounded-lg py-3 text-sm font-bold tracking-wide active:scale-95"
        >
          {isSubmitting ? "验证中..." : "登 录"}
        </button>

        <div className="theme-muted -mt-1 text-center text-sm font-medium">
          还没有创作者账号？{" "}
          <Link href="/register" className="theme-link font-bold">
            立即注册
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

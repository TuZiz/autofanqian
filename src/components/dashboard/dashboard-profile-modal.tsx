"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Send,
  Shield,
  UserRound,
  X,
} from "lucide-react";

import {
  apiRequest,
  firstFieldErrors,
  type ApiFieldErrors,
} from "@/lib/client/auth-api";
import type { SessionUser } from "@/lib/dashboard/dashboard-types";

type DashboardProfileModalProps = {
  onClose: () => void;
  onUserUpdated: (user: SessionUser) => void;
  user: SessionUser;
};

type StatusTone = "success" | "error" | "muted";

export function DashboardProfileModal({
  onClose,
  onUserUpdated,
  user,
}: DashboardProfileModalProps) {
  const [nameDraft, setNameDraft] = useState(user.name ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [codeBusy, setCodeBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  const displayName = user.name?.trim() || "未设置昵称";
  const roleLabel = user.isAdmin ? "管理员" : "作者";
  const closeDisabled = profileBusy || codeBusy || passwordBusy;

  const passwordMismatch = useMemo(() => {
    return Boolean(confirmPassword && newPassword && confirmPassword !== newPassword);
  }, [confirmPassword, newPassword]);

  useEffect(() => {
    const clearSensitiveFields = () => {
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFieldErrors({});
      setPasswordError("");
      setPasswordMessage("");
    };

    clearSensitiveFields();
    const timers = [
      window.setTimeout(clearSensitiveFields, 50),
      window.setTimeout(clearSensitiveFields, 250),
      window.setTimeout(clearSensitiveFields, 700),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (codeCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDisabled, onClose]);

  async function handleSaveProfile() {
    if (profileBusy) return;

    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    setProfileFieldErrors({});

    const response = await apiRequest<{ user: SessionUser }>(
      "/api/auth/profile",
      { name: nameDraft },
      { method: "PATCH" },
    );

    if (response.success && response.data?.user) {
      onUserUpdated(response.data.user);
      setNameDraft(response.data.user.name ?? "");
      setProfileMessage("昵称已保存。");
      setProfileBusy(false);
      return;
    }

    setProfileFieldErrors(firstFieldErrors(response.fieldErrors as ApiFieldErrors));
    setProfileError(response.message || "保存失败，请稍后重试。");
    setProfileBusy(false);
  }

  async function handleSendCode() {
    if (codeBusy || codeCooldown > 0) return;

    setCodeBusy(true);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordFieldErrors({});

    const response = await apiRequest<{
      email: string;
      expiresInSeconds: number;
      resendAfterSeconds: number;
    }>("/api/auth/password/send-code", { email: user.email });

    if (response.success) {
      setCodeCooldown(response.data?.resendAfterSeconds ?? 60);
      setPasswordMessage("验证码已发送到当前邮箱。");
      setCodeBusy(false);
      return;
    }

    setPasswordFieldErrors(firstFieldErrors(response.fieldErrors as ApiFieldErrors));
    setPasswordError(response.message || "验证码发送失败，请稍后重试。");
    setCodeBusy(false);
  }

  async function handleResetPassword() {
    if (passwordBusy) return;

    setPasswordError("");
    setPasswordMessage("");
    setPasswordFieldErrors({});

    if (!/^\d{6}$/.test(code.trim())) {
      setPasswordFieldErrors({ code: "请输入 6 位邮箱验证码。" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFieldErrors({ newPassword: "密码长度不能少于 6 位。" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFieldErrors({ confirmPassword: "两次输入的密码不一致。" });
      return;
    }

    setPasswordBusy(true);

    const response = await apiRequest<{
      user: SessionUser;
    }>("/api/auth/password/reset", {
      email: user.email,
      code: code.trim(),
      newPassword,
    });

    if (response.success) {
      if (response.data?.user) {
        onUserUpdated({
          ...response.data.user,
          isAdmin: user.isAdmin,
        });
      }
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("密码已修改，当前登录状态保持有效。");
      setPasswordBusy(false);
      return;
    }

    setPasswordFieldErrors(firstFieldErrors(response.fieldErrors as ApiFieldErrors));
    setPasswordError(response.message || "密码修改失败，请检查验证码后重试。");
    setPasswordBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm dark:bg-black/70"
        aria-label="关闭个人信息弹窗"
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        className="glass-panel relative z-10 flex max-h-[min(760px,calc(100vh-4rem))] w-full max-w-2xl flex-col overflow-hidden rounded-lg shadow-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="theme-kicker text-xs font-bold">个人信息</div>
              <h2 id="profile-dialog-title" className="theme-heading mt-1 truncate text-xl font-black">
                {displayName}
              </h2>
              <div className="theme-subheading mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Fingerprint className="h-3.5 w-3.5" />
                  ID {user.code}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="theme-button-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <ProfileFact icon={Shield} label="账号角色" value={roleLabel} />
            <ProfileFact label="邮箱状态" value={user.emailVerified ? "已验证" : "未验证"} />
            <ProfileFact label="最近登录" value={formatDateTime(user.lastLoginAt)} />
          </div>

          <div className="mt-5 grid gap-4">
            <section className="rounded-lg border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="theme-heading text-base font-black">资料设置</h3>
                  <p className="theme-subheading mt-1 text-sm">昵称会显示在工作台顶部，邮箱不在这里修改。</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={profileBusy}
                  className="theme-button-primary inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存昵称
                </button>
              </div>

              <label className="mt-4 block">
                <span className="theme-muted mb-1.5 block text-xs font-bold">昵称</span>
                <input
                  value={nameDraft}
                  onChange={(event) => {
                    setNameDraft(event.target.value.slice(0, 64));
                    setProfileMessage("");
                    setProfileError("");
                    setProfileFieldErrors({});
                  }}
                  maxLength={64}
                  placeholder="例如：番茄作者"
                  className="theme-input w-full rounded-lg px-4 py-3 text-sm font-semibold"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="theme-muted">留空表示不设置昵称。</span>
                <span className="theme-muted font-mono">{nameDraft.length}/64</span>
              </div>
              <InlineFieldError message={profileFieldErrors.name} />
              <StatusMessage error={profileError} message={profileMessage} />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="theme-heading text-base font-black">安全设置</h3>
                  <p className="theme-subheading mt-1 text-sm">通过当前邮箱验证码修改密码，完成后不会跳转页面。</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendCode()}
                  disabled={codeBusy || codeCooldown > 0}
                  className="theme-button-secondary inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {codeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {codeCooldown > 0 ? `${codeCooldown}s 后重发` : "发送验证码"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="邮箱验证码"
                  value={code}
                  onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 位验证码"
                  inputMode="numeric"
                  autoComplete="off"
                  name={`profile-reset-code-${user.id}`}
                  error={passwordFieldErrors.code}
                />
                <TextField
                  label="新密码"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="不少于 6 位"
                  type="password"
                  autoComplete="new-password"
                  name={`profile-new-password-${user.id}`}
                  error={passwordFieldErrors.newPassword}
                />
                <TextField
                  label="确认新密码"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="再次输入新密码"
                  type="password"
                  autoComplete="new-password"
                  name={`profile-confirm-password-${user.id}`}
                  error={passwordFieldErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  disabled={passwordBusy || passwordMismatch}
                  className="theme-button-primary mt-6 inline-flex h-[46px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  修改密码
                </button>
              </div>
              {passwordMismatch ? <InlineFieldError message="两次输入的密码不一致。" /> : null}
              <StatusMessage error={passwordError} message={passwordMessage} />
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileFact({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="theme-muted flex items-center gap-1.5 text-xs font-bold">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="theme-heading mt-1 truncate text-sm font-black">{value}</div>
    </div>
  );
}

function TextField({
  autoComplete = "off",
  error,
  inputMode,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete?: string;
  error?: string;
  inputMode?: "numeric";
  label: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="theme-muted mb-1.5 block text-xs font-bold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        data-1p-ignore="true"
        data-lpignore="true"
        inputMode={inputMode}
        name={name}
        type={type}
        placeholder={placeholder}
        className="theme-input w-full rounded-lg px-4 py-3 text-sm font-semibold"
      />
      <InlineFieldError message={error} />
    </label>
  );
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <div className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">{message}</div>;
}

function StatusMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const tone: StatusTone | null = error ? "error" : message ? "success" : null;

  if (!tone) return null;

  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200";

  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error || message}</span>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

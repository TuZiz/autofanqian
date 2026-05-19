"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Send,
  Shield,
  UserRound,
} from "lucide-react";

import {
  apiRequest,
  firstFieldErrors,
  type ApiFieldErrors,
} from "@/lib/client/auth-api";
import type { SessionUser } from "@/lib/dashboard/dashboard-types";

import {
  formatDateTime,
  InlineFieldError,
  StatusMessage,
} from "@/components/dashboard/dashboard-profile-modal-parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type DashboardProfileModalProps = {
  onClose: () => void;
  onUserUpdated: (user: SessionUser) => void;
  user: SessionUser;
};

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
  const groupLabel = user.displayGroup ?? (user.isAdmin ? "管理员" : "Free");
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
    const frame = window.requestAnimationFrame(clearSensitiveFields);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (codeCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [codeCooldown]);

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
          ...user,
          ...response.data.user,
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
    <Dialog isOpen onOpenChange={(open) => { if (!open && !closeDisabled) onClose(); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!closeDisabled}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700">
              <UserRound className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            </div>
            <div>
              <DialogTitle>{displayName}</DialogTitle>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--theme-text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" />
                  ID {user.code}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Info badges */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[var(--theme-surface-soft)] px-3 py-2">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--theme-text-muted)]">
              <Shield className="h-3 w-3" />
              用户组
            </div>
            <div className="mt-0.5 text-xs font-bold text-[var(--theme-text-strong)]">{groupLabel}</div>
          </div>
          <div className="rounded-lg bg-[var(--theme-surface-soft)] px-3 py-2">
            <div className="text-[10px] font-bold text-[var(--theme-text-muted)]">邮箱</div>
            <div className="mt-0.5 text-xs font-bold text-[var(--theme-text-strong)]">
              {user.emailVerified ? "已验证" : "未验证"}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--theme-surface-soft)] px-3 py-2">
            <div className="text-[10px] font-bold text-[var(--theme-text-muted)]">最近登录</div>
            <div className="mt-0.5 text-xs font-bold text-[var(--theme-text-strong)]">
              {formatDateTime(user.lastLoginAt)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Profile section */}
        <div className="rounded-lg border border-[var(--theme-border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text-strong)]">资料设置</h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">昵称会显示在工作台顶部</p>
            </div>
            <Button
              size="sm"
              onClick={() => void handleSaveProfile()}
              disabled={profileBusy}
            >
              {profileBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              保存
            </Button>
          </div>
          <div className="mt-3">
            <Label className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">昵称</Label>
            <Input
              value={nameDraft}
              onChange={(event) => {
                setNameDraft(event.target.value.slice(0, 64));
                setProfileMessage("");
                setProfileError("");
                setProfileFieldErrors({});
              }}
              maxLength={64}
              placeholder="例如：番茄作者"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)]">
              <span>留空表示不设置昵称</span>
              <span className="font-mono">{nameDraft.length}/64</span>
            </div>
            <InlineFieldError message={profileFieldErrors.name} />
            <StatusMessage error={profileError} message={profileMessage} />
          </div>
        </div>

        {/* Password section */}
        <div className="rounded-lg border border-[var(--theme-border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text-strong)]">安全设置</h3>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">通过邮箱验证码修改密码</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSendCode()}
              disabled={codeBusy || codeCooldown > 0}
            >
              {codeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {codeCooldown > 0 ? `${codeCooldown}s` : "发送验证码"}
            </Button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">
                邮箱验证码
              </Label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 位验证码"
                inputMode="numeric"
                autoComplete="off"
                name={`profile-reset-code-${user.id}`}
              />
              <InlineFieldError message={passwordFieldErrors.code} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">
                新密码
              </Label>
              <Input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="不少于 6 位"
                type="password"
                autoComplete="new-password"
                name={`profile-new-password-${user.id}`}
              />
              <InlineFieldError message={passwordFieldErrors.newPassword} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-bold text-[var(--theme-text-muted)]">
                确认新密码
              </Label>
              <Input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入新密码"
                type="password"
                autoComplete="new-password"
                name={`profile-confirm-password-${user.id}`}
              />
              <InlineFieldError message={passwordFieldErrors.confirmPassword} />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void handleResetPassword()}
                disabled={passwordBusy || passwordMismatch}
                className="w-full"
              >
                {passwordBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                修改密码
              </Button>
            </div>
          </div>
          {passwordMismatch ? <InlineFieldError message="两次输入的密码不一致。" /> : null}
          <StatusMessage error={passwordError} message={passwordMessage} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

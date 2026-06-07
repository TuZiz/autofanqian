"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRiskOperationLabel } from "@/lib/admin/admin-format";
import type {
  AdminMembershipTier,
  AdminUserListItem,
  AdminUserPatchInput,
  AdminUserStatus,
} from "@/lib/admin/admin-user-types";
import type { AdminUsersLiteController } from "@/lib/admin/use-admin-users-lite";

export function UserEditDialog({
  controller,
}: {
  controller: AdminUsersLiteController;
}) {
  const user = useMemo(
    () => controller.users.find((item) => item.id === controller.editingUserId) ?? null,
    [controller.editingUserId, controller.users],
  );

  if (!user) return null;

  return (
    <UserEditDialogContent
      user={user}
      saving={controller.saving}
      onClose={() => controller.setEditingUserId(null)}
      onSave={async (input) => {
        const ok = await controller.saveUser(user.id, input);
        if (ok) controller.setEditingUserId(null);
      }}
    />
  );
}

function UserEditDialogContent({
  onClose,
  onSave,
  saving,
  user,
}: {
  onClose: () => void;
  onSave: (input: AdminUserPatchInput) => Promise<void>;
  saving: boolean;
  user: AdminUserListItem;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [status, setStatus] = useState<AdminUserStatus>(user.status);
  const [bannedReason, setBannedReason] = useState(user.bannedReason ?? "");
  const [role, setRole] = useState<"user" | "admin">(
    normalizeEditableRole(user.role),
  );
  const [membershipTier, setMembershipTier] = useState<AdminMembershipTier>(user.membershipTier);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState(
    toDateTimeLocalValue(user.membershipExpiresAt),
  );
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const roleChanged = role !== normalizeEditableRole(user.role);
    const riskLabel = getRiskOperationLabel({
      role: roleChanged ? role : undefined,
      status: status !== user.status ? status : undefined,
    });

    if (riskLabel && !window.confirm(`确定要执行“${riskLabel}”吗？该操作会立即生效。`)) {
      return;
    }

    await onSave({
      bannedReason: bannedReason.trim() ? bannedReason.trim() : null,
      emailVerified,
      membershipExpiresAt: membershipExpiresAt ? new Date(membershipExpiresAt).toISOString() : null,
      membershipTier,
      name: name.trim() ? name.trim() : null,
      role: roleChanged ? role : undefined,
      status,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-sm">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-[18px] border border-[#d9e5f2] bg-white shadow-[0_28px_80px_rgba(15,64,116,0.22)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eef3f8] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7b8ca5]">
              编辑用户
            </p>
            <h2 className="mt-1 truncate text-lg font-black text-[#172033]">{user.email}</h2>
            {user.isRootAdmin ? (
              <p className="mt-1 text-xs font-black text-[#a16207]">root admin 受保护</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f3f7fc] hover:text-[#172033]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[calc(92dvh-138px)] overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="昵称">
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
            </Field>
            <Field label="状态">
              <select value={status} onChange={(event) => setStatus(event.target.value as AdminUserStatus)} className={selectClassName}>
                <option value="active">active</option>
                <option value="limited">limited</option>
                <option value="banned">banned</option>
                <option value="deleted">deleted</option>
              </select>
            </Field>
            <Field label="角色">
              <select value={role} onChange={(event) => setRole(event.target.value as "user" | "admin")} className={selectClassName}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </Field>
            <Field label="会员">
              <select value={membershipTier} onChange={(event) => setMembershipTier(event.target.value as AdminMembershipTier)} className={selectClassName}>
                <option value="default">default</option>
                <option value="plus">plus</option>
                <option value="pro">pro</option>
                <option value="max">max</option>
              </select>
            </Field>
            <Field label="会员到期">
              <Input
                type="datetime-local"
                value={membershipExpiresAt}
                onChange={(event) => setMembershipExpiresAt(event.target.value)}
              />
            </Field>
            <Field label="邮箱验证">
              <label className="flex h-8 items-center gap-2 text-sm font-bold text-[#172033]">
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(event) => setEmailVerified(event.target.checked)}
                  className="h-4 w-4"
                />
                已验证
              </label>
            </Field>
            <Field label="封禁原因" className="sm:col-span-2">
              <textarea
                value={bannedReason}
                onChange={(event) => setBannedReason(event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full rounded-lg border border-[#d9e5f2] bg-white px-3 py-2 text-sm font-semibold text-[#172033] outline-none focus:ring-2 focus:ring-[#1687f2]/20"
              />
            </Field>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#eef3f8] bg-[#f8fbff] px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-black text-[#64748b]">{label}</span>
      {children}
    </label>
  );
}

const selectClassName =
  "h-8 w-full rounded-lg border border-[#d9e5f2] bg-white px-2.5 text-sm font-semibold text-[#172033] outline-none focus:ring-2 focus:ring-[#1687f2]/20";

function normalizeEditableRole(role: string) {
  return role === "admin" || role === "super_admin" ? "admin" : "user";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

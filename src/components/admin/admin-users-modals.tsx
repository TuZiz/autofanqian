"use client";

import { Copy, Key, PencilLine, Plus } from "lucide-react";

import {
  membershipTierLabels,
  membershipTierValues,
} from "@/lib/auth/user-groups";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";
import {
  ModalFrame,
  ModalHeader,
  SelectField,
  TextField,
} from "./admin-modal-fields";

type AdminUsersModalsProps = {
  users: AdminUsersController;
};

export function AdminUsersModals({ users }: AdminUsersModalsProps) {
  return (
    <>
      {users.createOpen ? <CreateUserModal users={users} /> : null}
      {users.userEditor ? <UserEditorModal users={users} /> : null}
      {users.passwordModal ? <PasswordResultModal users={users} /> : null}
      {users.passwordEditor ? <PasswordEditorModal users={users} /> : null}
    </>
  );
}

function CreateUserModal({ users }: AdminUsersModalsProps) {
  return (
    <ModalFrame zIndex="z-[60]" onClose={() => users.setCreateOpen(false)}>
      <ModalHeader
        kicker="管理操作"
        title="新增用户"
        subtitle="不填写密码将自动生成临时密码。"
        onClose={() => users.setCreateOpen(false)}
      />

      <div className="mt-5 grid gap-3">
        <TextField
          label="邮箱"
          value={users.createEmail}
          onChange={users.setCreateEmail}
          type="email"
          placeholder="user@example.com"
        />
        <TextField
          label="昵称（可选）"
          value={users.createName}
          onChange={users.setCreateName}
          placeholder="例如：小番茄"
        />
        <TextField
          label="密码（可选）"
          value={users.createPassword}
          onChange={users.setCreatePassword}
          placeholder="留空则自动生成"
          inputClassName="font-mono"
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => users.setCreateOpen(false)}
          className="theme-button-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => void users.handleCreateUser()}
          disabled={users.createBusy}
          className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          <Plus className="h-4 w-4" />
          {users.createBusy ? "创建中..." : "创建用户"}
        </button>
      </div>
    </ModalFrame>
  );
}

function UserEditorModal({ users }: AdminUsersModalsProps) {
  const editor = users.userEditor;
  if (!editor) return null;
  const targetIsRootAdmin = editor.user.isRootAdmin;
  const profileLockedForViewer = targetIsRootAdmin && !users.isRootAdmin;
  const emailLocked = targetIsRootAdmin;

  function close() {
    if (users.userEditorBusy) return;
    users.setUserEditor(null);
  }

  return (
    <ModalFrame zIndex="z-[65]" onClose={close}>
      <ModalHeader
        kicker="用户资料"
        title="编辑用户"
        subtitle={
          <>
            编号：<span className="font-mono">{editor.user.code}</span>
          </>
        }
        onClose={close}
      />

      <div className="mt-5 grid gap-3">
        <TextField
          label="邮箱"
          value={editor.email}
          onChange={(value) => users.setUserEditor({ ...editor, email: value })}
          type="email"
          autoFocus={editor.focus === "email"}
          placeholder="user@example.com"
          disabled={emailLocked || profileLockedForViewer}
        />
        <TextField
          label="昵称"
          value={editor.name}
          onChange={(value) => users.setUserEditor({ ...editor, name: value })}
          autoFocus={editor.focus === "name"}
          placeholder="可留空"
          disabled={profileLockedForViewer}
        />

        <label className="theme-subheading flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={editor.emailVerified}
            onChange={(event) => users.setUserEditor({ ...editor, emailVerified: event.target.checked })}
            disabled={profileLockedForViewer}
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/50 dark:border-white/20 dark:bg-white/10"
          />
          邮箱已验证
        </label>

        {users.isRootAdmin ? (
          <SelectField
            label="会员组"
            value={editor.membershipTier}
            onChange={(value) =>
              users.setUserEditor({
                ...editor,
                membershipTier: value as typeof editor.membershipTier,
              })
            }
            disabled={targetIsRootAdmin}
            options={membershipTierValues.map((value) => ({
              value,
              label: membershipTierLabels[value],
            }))}
          />
        ) : null}

        {users.isRootAdmin ? (
          <SelectField
            label="后台权限"
            value={editor.role}
            onChange={(value) =>
              users.setUserEditor({
                ...editor,
                role: value as typeof editor.role,
              })
            }
            disabled={targetIsRootAdmin}
            options={[
              { value: "user", label: "普通用户" },
              { value: "admin", label: "管理员" },
            ]}
          />
        ) : null}

        <p className="theme-muted text-xs">
          {profileLockedForViewer
            ? "提示：根管理员账号受保护，普通管理员不能修改。"
            : targetIsRootAdmin
              ? "提示：根管理员账号的邮箱、会员组和管理员角色已锁定。"
              : users.isRootAdmin
                ? "提示：根管理员可以调整普通用户的会员组和管理员权限。"
                : "提示：普通管理员只能修改基础资料和密码，不能调整用户组或管理员权限。"}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="theme-button-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => void users.handleSaveUserEditor()}
          disabled={users.userEditorBusy}
          className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          <PencilLine className="h-4 w-4" />
          {users.userEditorBusy ? "保存中..." : "保存修改"}
        </button>
      </div>
    </ModalFrame>
  );
}

function PasswordResultModal({ users }: AdminUsersModalsProps) {
  const modal = users.passwordModal;
  if (!modal) return null;

  return (
    <ModalFrame zIndex="z-[70]" onClose={() => users.setPasswordModal(null)}>
      <ModalHeader
        kicker="密码结果"
        title={modal.title}
        subtitle={modal.subtitle}
        onClose={() => users.setPasswordModal(null)}
      />

      <div className="mt-5 rounded-lg border border-white/10 bg-white/30 px-4 py-4 dark:bg-white/5">
        <div className="theme-muted text-xs font-semibold uppercase tracking-wider">
          {modal.caption ?? "临时密码（仅显示一次）"}
        </div>
        <div className="theme-heading mt-2 break-all font-mono text-sm">{modal.password}</div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="theme-button-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
          onClick={() => {
            try {
              navigator.clipboard.writeText(modal.password);
              window.alert("已复制到剪贴板");
            } catch {
              window.alert("复制失败");
            }
          }}
        >
          <Copy className="h-4 w-4" />
          复制
        </button>
        <button
          type="button"
          className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold"
          onClick={() => users.setPasswordModal(null)}
        >
          确认
        </button>
      </div>
    </ModalFrame>
  );
}

function PasswordEditorModal({ users }: AdminUsersModalsProps) {
  const editor = users.passwordEditor;
  if (!editor) return null;

  function close() {
    if (users.passwordEditorBusy) return;
    users.setPasswordEditor(null);
  }

  return (
    <ModalFrame zIndex="z-[80]" onClose={close}>
      <ModalHeader
        kicker="管理操作"
        title="修改密码"
        subtitle={`账号：${editor.user.email}`}
        onClose={close}
      />

      <div className="mt-5">
        <TextField
          label="新密码"
          value={editor.value}
          onChange={(value) => users.setPasswordEditor({ ...editor, value })}
          onEnter={() => void users.handleApplyPassword()}
          placeholder="留空则自动生成临时密码（覆盖原密码）"
          inputClassName="font-mono"
        />
        <p className="theme-muted mt-2 text-xs">提示：会直接覆盖原密码；系统无法查询旧密码。</p>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="theme-button-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => void users.handleApplyPassword()}
          disabled={users.passwordEditorBusy}
          className="theme-button-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-70"
        >
          <Key className="h-4 w-4" />
          {users.passwordEditorBusy ? "保存中..." : "保存并覆盖"}
        </button>
      </div>
    </ModalFrame>
  );
}

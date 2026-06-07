"use client";

import { Copy, Key, PencilLine, Plus, Shield, UserRound } from "lucide-react";

import { Button } from "@/components/design-system";
import {
  membershipTierLabels,
  membershipTierValues,
} from "@/lib/auth/user-groups";
import type { AdminUsersController } from "@/lib/admin/use-admin-users";

import { AdminStatusPill } from "./admin-console-primitives";
import {
  CheckboxField,
  ModalFooter,
  ModalFrame,
  ModalHeader,
  ModalSection,
  NoticeText,
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
        subtitle="不填写密码时，系统会自动生成一次性临时密码。"
        onClose={() => users.setCreateOpen(false)}
      />

      <div className="mt-5 space-y-4">
        <ModalSection
          title="基础信息"
          description="先录入账号邮箱，再按需要补显示名称和初始密码。"
        >
          <TextField
            label="邮箱"
            value={users.createEmail}
            onChange={users.setCreateEmail}
            type="email"
            placeholder="user@example.com"
          />
          <TextField
            label="显示名称（可选）"
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
        </ModalSection>
      </div>

      <ModalFooter>
        <Button
          type="button"
          tone="secondary"
          onClick={() => users.setCreateOpen(false)}
        >
          取消
        </Button>
        <Button
          type="button"
          icon={Plus}
          onClick={() => void users.handleCreateUser()}
          disabled={users.createBusy}
          busy={users.createBusy}
        >
          创建用户
        </Button>
      </ModalFooter>
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

  const permissionHint = profileLockedForViewer
    ? "根管理员账号受保护，普通管理员不能修改。"
    : targetIsRootAdmin
      ? "根管理员账号的邮箱、会员组和后台角色已经锁定。"
      : users.isRootAdmin
        ? "根管理员可以调整普通用户的会员组和后台权限。"
        : "普通管理员只能修改基础资料和密码。";

  return (
    <ModalFrame zIndex="z-[65]" onClose={close}>
      <ModalHeader
        kicker="用户资料"
        title="编辑用户"
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusPill tone="neutral">
              编号 {editor.user.code}
            </AdminStatusPill>
            {targetIsRootAdmin ? (
              <AdminStatusPill tone="warning">根管理员</AdminStatusPill>
            ) : editor.user.isAdmin ? (
              <AdminStatusPill tone="brand">管理员</AdminStatusPill>
            ) : (
              <AdminStatusPill tone="neutral">普通用户</AdminStatusPill>
            )}
          </div>
        }
        onClose={close}
      />

      <div className="mt-5 space-y-4">
        <ModalSection
          title="基础信息"
          description="邮箱和显示名称直接影响后台检索与账号识别。"
        >
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
            label="显示名称"
            value={editor.name}
            onChange={(value) => users.setUserEditor({ ...editor, name: value })}
            autoFocus={editor.focus === "name"}
            placeholder="可留空"
            disabled={profileLockedForViewer}
          />
          <CheckboxField
            checked={editor.emailVerified}
            onChange={(checked) =>
              users.setUserEditor({ ...editor, emailVerified: checked })
            }
            disabled={profileLockedForViewer}
            label="邮箱已验证"
            description="勾选后，该账号将不再需要邮箱验证流程。"
          />
        </ModalSection>

        {users.isRootAdmin ? (
          <ModalSection
            title="权限与会员"
            description="只有根管理员可以调整会员组和后台角色。"
          >
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
          </ModalSection>
        ) : null}

        <NoticeText tone={targetIsRootAdmin ? "warning" : "neutral"}>
          {permissionHint}
        </NoticeText>
      </div>

      <ModalFooter>
        <Button type="button" tone="secondary" onClick={close}>
          取消
        </Button>
        <Button
          type="button"
          icon={PencilLine}
          onClick={() => void users.handleSaveUserEditor()}
          disabled={users.userEditorBusy}
          busy={users.userEditorBusy}
        >
          保存修改
        </Button>
      </ModalFooter>
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

      <div className="mt-5 space-y-4">
        <ModalSection
          title={modal.caption ?? "一次性密码"}
          description="该密码只会在当前弹窗中显示一次，请及时复制并安全传达。"
        >
          <div className="rounded-[16px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-4">
            <div className="break-all font-mono text-sm font-bold text-[var(--theme-text-strong)]">
              {modal.password}
            </div>
          </div>
        </ModalSection>
      </div>

      <ModalFooter>
        <Button
          type="button"
          tone="secondary"
          icon={Copy}
          onClick={() => {
            try {
              navigator.clipboard.writeText(modal.password);
              window.alert("已复制到剪贴板");
            } catch {
              window.alert("复制失败");
            }
          }}
        >
          复制
        </Button>
        <Button
          type="button"
          onClick={() => users.setPasswordModal(null)}
        >
          确认
        </Button>
      </ModalFooter>
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
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusPill tone="neutral">
              {editor.user.email}
            </AdminStatusPill>
            {editor.user.isAdmin ? (
              <AdminStatusPill tone="brand">
                <Shield className="h-3 w-3" />
                管理员
              </AdminStatusPill>
            ) : (
              <AdminStatusPill tone="neutral">
                <UserRound className="h-3 w-3" />
                普通用户
              </AdminStatusPill>
            )}
          </div>
        }
        onClose={close}
      />

      <div className="mt-5 space-y-4">
        <ModalSection
          title="新密码"
          description="留空时会自动生成临时密码，并直接覆盖原密码。"
        >
          <TextField
            label="新密码"
            value={editor.value}
            onChange={(value) => users.setPasswordEditor({ ...editor, value })}
            onEnter={() => void users.handleApplyPassword()}
            placeholder="留空则自动生成临时密码"
            inputClassName="font-mono"
          />
        </ModalSection>

        <NoticeText tone="warning">
          系统不会回显旧密码。保存后会直接覆盖原密码，请确认再执行。
        </NoticeText>
      </div>

      <ModalFooter>
        <Button type="button" tone="secondary" onClick={close}>
          取消
        </Button>
        <Button
          type="button"
          icon={Key}
          onClick={() => void users.handleApplyPassword()}
          disabled={users.passwordEditorBusy}
          busy={users.passwordEditorBusy}
        >
          保存并覆盖
        </Button>
      </ModalFooter>
    </ModalFrame>
  );
}

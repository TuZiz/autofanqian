"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  AdminUserRow,
  AdminUsersSessionUser,
  PasswordEditorState,
  PasswordModalState,
  UserEditorState,
  UsersResponse,
} from "./users-types";

export function useAdminUsers() {
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const usersRequestIdRef = useRef(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);
  const [passwordEditor, setPasswordEditor] = useState<PasswordEditorState | null>(null);
  const [passwordEditorBusy, setPasswordEditorBusy] = useState(false);
  const [userEditor, setUserEditor] = useState<UserEditorState | null>(null);
  const [userEditorBusy, setUserEditorBusy] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [pageSize, total]);

  const loadUsers = useCallback(
    async (nextPage: number, nextQuery: string) => {
      const requestId = (usersRequestIdRef.current += 1);
      setLoading(true);

      const res = await apiRequest<UsersResponse>(
        `/api/admin/users?q=${encodeURIComponent(nextQuery)}&page=${encodeURIComponent(
          String(nextPage),
        )}&pageSize=${encodeURIComponent(String(pageSize))}`,
      );

      if (requestId !== usersRequestIdRef.current) return;
      setLoading(false);

      if (!res.success || !res.data) {
        window.alert(res.message || "加载用户失败");
        return;
      }

      setUsers(res.data.users ?? []);
      setTotal(res.data.total ?? 0);
    },
    [pageSize],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await apiRequest<{ user: AdminUsersSessionUser }>("/api/auth/session");
      if (cancelled) return;

      if (!session.success || !session.data?.user) {
        window.location.href = "/login";
        return;
      }

      if (!session.data.user.isAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setUserEmail(session.data.user.email);
      setIsAdmin(Boolean(session.data.user.isAdmin));
      setBootstrapLoading(false);
      void loadUsers(1, "");
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  async function handleSearch() {
    setPage(1);
    await loadUsers(1, query);
  }

  function openUserEditor(target: AdminUserRow, focus?: "email" | "name") {
    setUserEditor({
      user: target,
      email: target.email,
      name: target.name ?? "",
      emailVerified: target.emailVerified,
      focus,
    });
  }

  async function handleSaveUserEditor() {
    if (!userEditor || userEditorBusy) return;

    const nextEmail = userEditor.email.trim();
    if (!nextEmail) {
      window.alert("邮箱不能为空");
      return;
    }

    if (!window.confirm(`确定要保存 ${userEditor.user.email} 的修改吗？（修改邮箱可能影响管理员权限与登录）`)) {
      return;
    }

    setUserEditorBusy(true);
    const res = await apiRequest<{ user: AdminUserRow }>(
      `/api/admin/users/${encodeURIComponent(userEditor.user.id)}`,
      {
        email: nextEmail,
        name: userEditor.name.trim() ? userEditor.name.trim() : null,
        emailVerified: userEditor.emailVerified,
      },
      { method: "PUT" },
    );
    setUserEditorBusy(false);

    if (!res.success || !res.data?.user) {
      window.alert(res.message || "保存失败");
      return;
    }

    setUserEditor(null);
    void loadUsers(page, query);
  }

  async function handleApplyPassword() {
    if (!passwordEditor || passwordEditorBusy) return;

    const targetUser = passwordEditor.user;
    const nextPassword = passwordEditor.value.trim();
    if (nextPassword && nextPassword.length < 6) {
      window.alert("密码长度不能少于 6 位");
      return;
    }

    if (
      !window.confirm(
        nextPassword
          ? `确定要把 ${targetUser.email} 的密码覆盖为指定密码吗？`
          : `未填写密码，将为 ${targetUser.email} 生成临时密码并覆盖原密码，继续吗？`,
      )
    ) {
      return;
    }

    setPasswordEditorBusy(true);
    const res = await apiRequest<{ user: AdminUserRow; tempPassword: string }>(
      `/api/admin/users/${encodeURIComponent(targetUser.id)}/reset-password`,
      nextPassword ? { password: nextPassword } : {},
    );
    setPasswordEditorBusy(false);

    if (!res.success || !res.data?.tempPassword) {
      window.alert(res.message || "修改密码失败");
      return;
    }

    setPasswordEditor(null);
    setPasswordModal({
      title: nextPassword ? "密码已修改" : "临时密码已生成",
      subtitle: `账号：${targetUser.email}`,
      caption: nextPassword ? "新密码" : "临时密码（仅显示一次）",
      password: res.data.tempPassword,
    });
    void loadUsers(page, query);
  }

  async function handleDeleteUser(user: AdminUserRow) {
    if (!window.confirm(`确定要删除用户 ${user.email} 吗？此操作不可恢复。`)) return;

    const res = await apiRequest<{ id: string }>(
      `/api/admin/users/${encodeURIComponent(user.id)}`,
      undefined,
      { method: "DELETE" },
    );

    if (!res.success) {
      window.alert(res.message || "删除失败");
      return;
    }

    void loadUsers(page, query);
  }

  async function handleCreateUser() {
    if (createBusy) return;

    const email = createEmail.trim();
    if (!email) {
      window.alert("请输入邮箱");
      return;
    }

    setCreateBusy(true);
    const res = await apiRequest<{ user: AdminUserRow; tempPassword: string }>("/api/admin/users", {
      email,
      name: createName.trim() || undefined,
      password: createPassword.trim() || undefined,
    });
    setCreateBusy(false);

    if (!res.success || !res.data?.tempPassword) {
      window.alert(res.message || "创建用户失败");
      return;
    }

    const providedPassword = createPassword.trim();
    setCreateOpen(false);
    setCreateEmail("");
    setCreateName("");
    setCreatePassword("");
    setPasswordModal({
      title: "用户已创建",
      subtitle: `账号：${res.data.user.email}`,
      caption: providedPassword ? "初始密码" : "临时密码（仅显示一次）",
      password: res.data.tempPassword,
    });

    setPage(1);
    setQuery("");
    void loadUsers(1, "");
  }

  async function goToPage(nextPage: number) {
    setPage(nextPage);
    await loadUsers(nextPage, query);
  }

  return {
    bootstrapLoading,
    createBusy,
    createEmail,
    createName,
    createOpen,
    createPassword,
    goToPage,
    handleApplyPassword,
    handleCreateUser,
    handleDeleteUser,
    handleSaveUserEditor,
    handleSearch,
    isAdmin,
    loadUsers,
    loading,
    openUserEditor,
    page,
    passwordEditor,
    passwordEditorBusy,
    passwordModal,
    query,
    setCreateEmail,
    setCreateName,
    setCreateOpen,
    setCreatePassword,
    setPasswordEditor,
    setPasswordModal,
    setQuery,
    setUserEditor,
    total,
    totalPages,
    userEditor,
    userEditorBusy,
    userEmail,
    users,
  };
}

export type AdminUsersController = ReturnType<typeof useAdminUsers>;

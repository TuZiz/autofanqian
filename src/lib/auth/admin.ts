import "server-only";

import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { getDisplayGroup } from "@/lib/auth/user-groups";

type AdminLikeUser = {
  email: string;
  role?: string | null;
  membershipTier?: string | null;
};

type EffectiveUserRole = "user" | "admin" | "super_admin";

const DEFAULT_ROOT_ADMIN_EMAILS = [
  "1606975933@qq.com",
  "codex-audit@example.local",
];

function parseEmailList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getRootAdminEmails() {
  const emails = parseEmailList(
    process.env.ROOT_ADMIN_EMAILS || process.env.ADMIN_EMAILS,
  );

  for (const email of DEFAULT_ROOT_ADMIN_EMAILS) {
    emails.add(email);
  }

  return Array.from(emails);
}

export function isRootAdminEmail(email: string) {
  return getRootAdminEmails().includes(email.trim().toLowerCase());
}

export function isAdminEmail(email: string) {
  return isRootAdminEmail(email);
}

export function isRootAdminUser(user: AdminLikeUser | null | undefined) {
  if (!user) return false;
  return isRootAdminEmail(user.email);
}

export function isAdminUser(user: AdminLikeUser | null | undefined) {
  if (!user) return false;
  if (isRootAdminUser(user)) return true;
  if (user.role === "admin" || user.role === "super_admin") return true;
  return false;
}

export function isSuperAdminUser(user: AdminLikeUser | null | undefined) {
  if (!user) return false;
  return isRootAdminUser(user) || user.role === "super_admin";
}

export function getEffectiveUserRole(user: AdminLikeUser | null | undefined): EffectiveUserRole {
  if (!user) return "user";
  if (isRootAdminUser(user)) return "super_admin";
  if (user.role === "admin" || user.role === "super_admin") return user.role;
  return "user";
}

export function normalizeStoredRole(params: {
  email: string;
  requestedRole?: "admin" | "user" | null;
}) {
  if (isRootAdminEmail(params.email)) {
    return "super_admin" as const;
  }

  return params.requestedRole === "admin" ? "admin" : "user";
}

export function getUserAccessSnapshot(user: AdminLikeUser | null | undefined) {
  const role = getEffectiveUserRole(user);
  const isAdmin = role === "admin" || role === "super_admin";

  return {
    displayGroup: isAdmin ? "管理员" : getDisplayGroup(user ?? {}),
    isAdmin,
    isRootAdmin: isRootAdminUser(user),
    role,
  };
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
  }

  if (!isAdminUser(user)) {
    throw new AuthApiError(403, "无权限访问管理员功能。");
  }

  return user;
}

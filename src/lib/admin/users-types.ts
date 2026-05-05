import type { MembershipTierValue } from "@/lib/auth/user-groups";
import type { SessionAccessFields, SessionAccessRole } from "@/lib/auth/session-user-types";

export type AdminUsersSessionUser = SessionAccessFields & {
  id: string;
  email: string;
};

export type AdminUserRow = {
  id: string;
  code: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isAdmin: boolean;
  isRootAdmin: boolean;
  membershipTier: MembershipTierValue;
  role: SessionAccessRole;
  displayGroup: string;
  hasPassword: boolean;
};

export type UsersResponse = {
  total: number;
  page: number;
  pageSize: number;
  users: AdminUserRow[];
};

export type PasswordModalState = {
  title: string;
  subtitle: string;
  caption?: string;
  password: string;
};

export type PasswordEditorState = {
  user: AdminUserRow;
  value: string;
};

export type UserEditorState = {
  user: AdminUserRow;
  email: string;
  name: string;
  emailVerified: boolean;
  membershipTier: MembershipTierValue;
  role: "user" | "admin";
  focus?: "email" | "name";
};

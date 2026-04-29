export type AdminUsersSessionUser = {
  id: string;
  email: string;
  isAdmin?: boolean;
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
  focus?: "email" | "name";
};

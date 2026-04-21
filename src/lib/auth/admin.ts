import "server-only";

import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";

function parseAdminEmails(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  const admins = parseAdminEmails(
    process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL,
  );

  // Dev convenience: if no whitelist is configured, allow admin tools in dev only.
  if (!admins.length) {
    return process.env.NODE_ENV !== "production";
  }

  return admins.includes(email.trim().toLowerCase());
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
  }

  if (!isAdminEmail(user.email)) {
    throw new AuthApiError(403, "无权限访问管理员功能。");
  }

  return user;
}


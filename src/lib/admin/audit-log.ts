import "server-only";

import { Prisma } from "@prisma/client";

import { getRequestMeta } from "@/lib/auth/request";
import type { SessionUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|secret|token|password|authorization|cookie)/i;

function sanitizeNestedValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNestedValue(item)) as Prisma.InputJsonArray;
  }
  if (typeof value === "object") {
    const output: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[已隐藏]"
        : sanitizeNestedValue(item);
    }
    return output as Prisma.InputJsonObject;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

function sanitizeValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return sanitizeNestedValue(value) ?? Prisma.JsonNull;
}

export async function recordAdminAuditLog(params: {
  request?: Request;
  adminUser: Pick<SessionUser, "id" | "email">;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const meta = params.request ? getRequestMeta(params.request) : {};
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUser.id,
        adminEmail: params.adminUser.email,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        before: sanitizeValue(params.before),
        after: sanitizeValue(params.after),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error("record admin audit log failed", error);
  }
}

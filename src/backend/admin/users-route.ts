import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import {
  assertCanManageTargetUser,
  getUserAccessSnapshot,
  isRootAdminEmail,
  isRootAdminUser,
  normalizeStoredRole,
  requireAdminUser,
} from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { hashPassword } from "@/lib/auth/password";
import { getUniqueConstraintTargets } from "@/lib/auth/user-code";
import { membershipTierValues } from "@/lib/auth/user-groups";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  includeDeleted: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
});

const createUserSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().trim().max(64).optional(),
  // Optional: if omitted, we'll generate a temporary password.
  password: z.string().min(6).max(72).optional(),
  emailVerified: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
  membershipTier: z.enum(membershipTierValues).optional(),
});

function generateTempPassword() {
  // base64url avoids confusing characters like "+" and "/".
  const token = crypto.randomBytes(12).toString("base64url");
  return `T${token}`;
}

function buildWhere(q: string | undefined): Prisma.UserWhereInput {
  const trimmed = (q ?? "").trim();
  if (!trimmed) return {};

  const or: Prisma.UserWhereInput[] = [];

  if (/^\d+$/.test(trimmed)) {
    const parsedCode = Number(trimmed);
    if (Number.isSafeInteger(parsedCode) && parsedCode >= 1 && parsedCode <= 2_147_483_647) {
      or.push({ code: parsedCode });
    }
  }

  or.push(
    { email: { contains: trimmed, mode: "insensitive" } },
    { name: { contains: trimmed, mode: "insensitive" } },
    { id: { contains: trimmed } },
  );

  return {
    OR: or,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();

    const url = new URL(request.url);
    const query = listQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      includeDeleted: url.searchParams.get("includeDeleted") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const where: Prisma.UserWhereInput = {
      ...buildWhere(query.q),
      ...(query.includeDeleted ? {} : { status: { not: "deleted" } }),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, rows] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          code: true,
          email: true,
          name: true,
          emailVerified: true,
          status: true,
          role: true,
          membershipTier: true,
          lastLoginAt: true,
          createdAt: true,
          passwordHash: true,
        },
      }),
    ]);

    const users = rows.map((row) => {
      const access = getUserAccessSnapshot(row);

      return {
        id: row.id,
        code: row.code,
        email: row.email,
        name: row.name,
        emailVerified: row.emailVerified,
        status: row.status,
        role: access.role,
        membershipTier: row.membershipTier,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        displayGroup: access.displayGroup,
        isAdmin: access.isAdmin,
        isRootAdmin: access.isRootAdmin,
        hasPassword: Boolean(row.passwordHash),
      };
    });

    return successResponse(
      {
        total,
        page: query.page,
        pageSize: query.pageSize,
        users,
      },
      { message: "OK" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();

    const body = await parseJsonBody(request, createUserSchema);
    const role = body.role ?? "user";
    const email = body.email.trim();
    const adminIsRoot = isRootAdminUser(adminUser);

    if (isRootAdminEmail(email)) {
      throw new AuthApiError(403, "不能在后台创建根管理员邮箱账号，请通过 ROOT_ADMIN_EMAILS 配置并使用正常注册流程。");
    }

    if (role !== "user" && !adminIsRoot) {
      throw new AuthApiError(403, "只有根管理员可以创建管理员账号。");
    }

    if (body.membershipTier && body.membershipTier !== "default" && !adminIsRoot) {
      throw new AuthApiError(403, "只有根管理员可以设置用户组。");
    }

    assertCanManageTargetUser({
      adminUser,
      targetUser: {
        email,
        role,
        membershipTier: body.membershipTier ?? "default",
      },
      action: role === "admin" ? "role_change" : "update",
    });

    const effectivePassword = body.password?.trim() || generateTempPassword();
    const passwordHash = await hashPassword(effectivePassword);

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name?.trim() || null,
        passwordHash,
        emailVerified: body.emailVerified ?? true,
        role: normalizeStoredRole({
          email,
          requestedRole: role,
        }),
        membershipTier: body.membershipTier ?? "default",
      },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        emailVerified: true,
        status: true,
        role: true,
        membershipTier: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "user.create",
      targetType: "User",
      targetId: user.id,
      after: { ...user, tempPassword: "[已隐藏]" },
    });

    return successResponse(
      {
        user: {
          ...user,
          ...getUserAccessSnapshot(user),
          hasPassword: true,
        },
        tempPassword: effectivePassword,
      },
      { message: "用户已创建" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = getUniqueConstraintTargets(error);

      if (targets.includes("email")) {
        return errorResponse(new AuthApiError(409, "邮箱已存在"));
      }

      if (targets.includes("code")) {
        return errorResponse(new AuthApiError(503, "用户编码序列冲突，请稍后重试"));
      }

      return errorResponse(new AuthApiError(409, "邮箱已存在"));
    }

    return errorResponse(error);
  }
}

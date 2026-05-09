import { Prisma } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import {
  getUserAccessSnapshot,
  isRootAdminEmail,
  isRootAdminUser,
  normalizeStoredRole,
  requireAdminUser,
} from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { membershipTierValues } from "@/lib/auth/user-groups";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const updateSchema = z.object({
  email: z.string().email().max(320).optional(),
  name: z.string().max(64).optional().nullable(),
  emailVerified: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
  membershipTier: z.enum(membershipTierValues).optional(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const adminUser = await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, updateSchema);
    const adminIsRoot = isRootAdminUser(adminUser);

    if (body.membershipTier !== undefined && !adminIsRoot) {
      throw new AuthApiError(403, "只有根管理员可以调整用户组。");
    }

    if (body.role !== undefined && !adminIsRoot) {
      throw new AuthApiError(403, "只有根管理员可以调整管理员角色。");
    }

    const before = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        emailVerified: true,
        role: true,
        membershipTier: true,
      },
    });

    if (!before) {
      throw new AuthApiError(404, "用户不存在");
    }

    if (isRootAdminUser(before) && !adminIsRoot) {
      throw new AuthApiError(403, "根管理员账号受保护，普通管理员不能修改。");
    }

    const nextEmail = body.email?.trim();
    if (
      !isRootAdminUser(before) &&
      nextEmail &&
      isRootAdminEmail(nextEmail) &&
      !adminIsRoot
    ) {
      throw new AuthApiError(403, "只有根管理员可以把账号邮箱改为根管理员邮箱。");
    }

    if (isRootAdminUser(before) && nextEmail && nextEmail.toLowerCase() !== before.email.toLowerCase()) {
      throw new AuthApiError(400, "根管理员邮箱不能在后台修改。");
    }

    if (isRootAdminUser(before) && (body.role !== undefined || body.membershipTier !== undefined)) {
      throw new AuthApiError(400, "根管理员账号的角色和用户组不能在后台修改。");
    }

    let nextName: string | null | undefined = undefined;
    if (body.name !== undefined) {
      const trimmed = typeof body.name === "string" ? body.name.trim() : "";
      nextName = trimmed ? trimmed : null;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        email: nextEmail ?? undefined,
        name: nextName,
        emailVerified: body.emailVerified,
        role:
          body.role !== undefined
            ? normalizeStoredRole({
                email: nextEmail ?? before.email,
                requestedRole: body.role,
              })
            : undefined,
        membershipTier: body.membershipTier,
      },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        emailVerified: true,
        role: true,
        membershipTier: true,
        lastLoginAt: true,
        createdAt: true,
        passwordHash: true,
      },
    });
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "user.update",
      targetType: "User",
      targetId: updated.id,
      before,
      after: updated,
    });

    return successResponse(
      {
        user: {
          id: updated.id,
          code: updated.code,
          email: updated.email,
          name: updated.name,
          emailVerified: updated.emailVerified,
          membershipTier: updated.membershipTier,
          lastLoginAt: updated.lastLoginAt,
          createdAt: updated.createdAt,
          ...getUserAccessSnapshot(updated),
          hasPassword: Boolean(updated.passwordHash),
        },
      },
      { message: "用户已更新" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(new AuthApiError(404, "用户不存在"));
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(new AuthApiError(409, "邮箱已存在"));
    }

    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const adminUser = await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    if (params.id === adminUser.id) {
      throw new AuthApiError(400, "不能删除当前登录的账号");
    }

    const before = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        role: true,
        membershipTier: true,
      },
    });
    if (!before) {
      throw new AuthApiError(404, "用户不存在");
    }
    if (isRootAdminUser(before)) {
      throw new AuthApiError(400, "根管理员账号不能删除。");
    }

    await prisma.user.delete({ where: { id: params.id } });
    await recordAdminAuditLog({
      request: _request,
      adminUser,
      action: "user.delete",
      targetType: "User",
      targetId: params.id,
      before,
    });

    return successResponse({ id: params.id }, { message: "用户已删除" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(new AuthApiError(404, "用户不存在"));
    }

    return errorResponse(error);
  }
}

import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import {
  assertCanManageTargetUser,
  getUserAccessSnapshot,
  isRootAdminUser,
  requireAdminUser,
} from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { hashPassword } from "@/lib/auth/password";
import { revokeUserSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const bodySchema = z.object({
  password: z.string().min(6).max(72).optional(),
});

function generateTempPassword() {
  const token = crypto.randomBytes(12).toString("base64url");
  return `T${token}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, bodySchema);

    const effectivePassword = body.password?.trim() || generateTempPassword();
    const passwordHash = await hashPassword(effectivePassword);

    const before = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        membershipTier: true,
      },
    });
    if (!before) {
      throw new AuthApiError(404, "用户不存在");
    }
    if (isRootAdminUser(before) && !isRootAdminUser(adminUser)) {
      throw new AuthApiError(403, "根管理员账号受保护，普通管理员不能重置密码。");
    }

    assertCanManageTargetUser({
      adminUser,
      targetUser: before,
      action: "reset_password",
    });

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
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
    await revokeUserSessions(params.id);
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "user.reset_password",
      targetType: "User",
      targetId: user.id,
      after: { userId: user.id, tempPassword: "[已隐藏]" },
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
      { message: "密码已重置" },
    );
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

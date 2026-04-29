import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { isAdminEmail, requireAdminUser } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

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
    await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, bodySchema);

    const effectivePassword = body.password?.trim() || generateTempPassword();
    const passwordHash = await hashPassword(effectivePassword);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        user: {
          ...user,
          isAdmin: isAdminEmail(user.email),
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

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { isAdminEmail, requireAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const updateSchema = z.object({
  email: z.string().email().max(320).optional(),
  name: z.string().max(64).optional().nullable(),
  emailVerified: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, updateSchema);

    const nextEmail = body.email?.trim();
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
      },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    return successResponse(
      {
        user: {
          id: updated.id,
          code: updated.code,
          email: updated.email,
          name: updated.name,
          emailVerified: updated.emailVerified,
          lastLoginAt: updated.lastLoginAt,
          createdAt: updated.createdAt,
          isAdmin: isAdminEmail(updated.email),
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

    await prisma.user.delete({ where: { id: params.id } });

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

import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { isAdminEmail, requireAdminUser } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { getUniqueConstraintTargets } from "@/lib/auth/user-code";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
});

const createUserSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().trim().max(64).optional(),
  // Optional: if omitted, we'll generate a temporary password.
  password: z.string().min(6).max(72).optional(),
  emailVerified: z.boolean().optional(),
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
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const where = buildWhere(query.q);
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
          lastLoginAt: true,
          createdAt: true,
          passwordHash: true,
        },
      }),
    ]);

    const users = rows.map((row) => ({
      id: row.id,
      code: row.code,
      email: row.email,
      name: row.name,
      emailVerified: row.emailVerified,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      isAdmin: isAdminEmail(row.email),
      hasPassword: Boolean(row.passwordHash),
    }));

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
    await requireAdminUser();

    const body = await parseJsonBody(request, createUserSchema);

    const effectivePassword = body.password?.trim() || generateTempPassword();
    const passwordHash = await hashPassword(effectivePassword);

    const user = await prisma.user.create({
      data: {
        email: body.email.trim(),
        name: body.name?.trim() || null,
        passwordHash,
        emailVerified: body.emailVerified ?? true,
      },
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

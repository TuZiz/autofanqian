import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const work = await prisma.work.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        genreId: true,
        genreLabel: true,
        idea: true,
        tags: true,
        platformId: true,
        platformLabel: true,
        words: true,
        dnaBookTitle: true,
        tag: true,
        title: true,
        synopsis: true,
        outline: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!work) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isAdmin = isAdminEmail(user.email);
    if (!isAdmin && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限访问该作品。");
    }

    return successResponse(
      {
        work: {
          ...work,
          createdAt: work.createdAt.toISOString(),
          updatedAt: work.updatedAt.toISOString(),
        },
      },
      { message: "OK" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const work = await prisma.work.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, title: true },
    });

    if (!work) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isAdmin = isAdminEmail(user.email);
    if (!isAdmin && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限删除该作品。");
    }

    await prisma.work.delete({ where: { id: params.id } });

    return successResponse(
      { deleted: { id: work.id } },
      { message: "已删除" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

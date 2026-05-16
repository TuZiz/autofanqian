import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import type { StoryOutline } from "@/lib/create/outline-draft";
import {
  inferTargetChapters,
  normalizeProgressiveOutline,
} from "@/lib/create/progressive-planning";
import { getPlanningConfig } from "@/lib/config/planning";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const patchWorkSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

function serializeWork<T extends { createdAt: Date; updatedAt: Date }>(work: T) {
  return {
    ...work,
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  };
}

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
        targetChapters: true,
        plannedUntilChapter: true,
        planningMode: true,
        rawOutline: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!work || work.deletedAt) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isAdmin = isAdminUser(user);
    if (!isAdmin && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限访问该作品。");
    }

    let normalizedWork = work;
    const outline = work.outline as unknown as StoryOutline;
    const targetChapters = work.targetChapters ?? inferTargetChapters(outline);
    if (!work.plannedUntilChapter || !outline.planningMode) {
      const planningConfig = await getPlanningConfig();
      const progressive = normalizeProgressiveOutline(outline, {
        config: planningConfig,
        targetChapters,
      });
      normalizedWork = await prisma.work.update({
        where: { id: work.id },
        data: {
          outline: progressive.outline,
          rawOutline: (work.rawOutline ?? work.outline) as Prisma.InputJsonValue,
          targetChapters: progressive.targetChapters,
          plannedUntilChapter: progressive.plannedUntilChapter,
          planningMode: "progressive",
        },
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
          targetChapters: true,
          plannedUntilChapter: true,
          planningMode: true,
          rawOutline: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return successResponse({ work: serializeWork(normalizedWork) }, { message: "OK" });
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  assertSameOriginRequest(request);
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, patchWorkSchema);

    const existing = await prisma.work.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, deletedAt: true },
    });

    if (!existing || existing.deletedAt) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isAdmin = isAdminUser(user);
    if (!isAdmin && existing.userId !== user.id) {
      throw new AuthApiError(403, "无权限修改该作品。");
    }

    const work = await prisma.work.update({
      where: { id: params.id },
      data: {
        title: body.title,
      },
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
        targetChapters: true,
        plannedUntilChapter: true,
        planningMode: true,
        rawOutline: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      { work: serializeWork(work) },
      { message: "作品书名已保存。" },
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
  assertSameOriginRequest(_request);
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const work = await prisma.work.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, title: true, deletedAt: true },
    });

    if (!work || work.deletedAt) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isAdmin = isAdminUser(user);
    if (!isAdmin && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限删除该作品。");
    }

    await prisma.work.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

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

import { z } from "zod";

import { isAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  try {
    assertSameOriginRequest(_request);
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const work = await prisma.work.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });

    if (!work) {
      throw new AuthApiError(404, "作品不存在。");
    }

    if (!isAdminUser(user) && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限恢复该章节。");
    }

    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: params.index } },
      select: { id: true },
    });

    if (!chapter) {
      throw new AuthApiError(404, "章节不存在。");
    }

    const restored = await prisma.chapter.update({
      where: { id: chapter.id },
      data: { deletedAt: null },
      select: { id: true, index: true, deletedAt: true, updatedAt: true },
    });

    return successResponse(
      { chapter: { ...restored, updatedAt: restored.updatedAt.toISOString() } },
      { message: "章节已恢复。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

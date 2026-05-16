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
});

export async function POST(
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
      select: { id: true, userId: true, deletedAt: true },
    });

    if (!work) {
      throw new AuthApiError(404, "作品不存在。");
    }

    if (!isAdminUser(user) && work.userId !== user.id) {
      throw new AuthApiError(403, "无权限恢复该作品。");
    }

    const restored = await prisma.work.update({
      where: { id: work.id },
      data: { deletedAt: null },
      select: { id: true, deletedAt: true, updatedAt: true },
    });

    return successResponse(
      { work: { ...restored, updatedAt: restored.updatedAt.toISOString() } },
      { message: "作品已恢复。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

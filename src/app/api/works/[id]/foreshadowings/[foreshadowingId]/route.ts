import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  foreshadowingId: z.string().min(1).max(64),
});
const statusSchema = z.enum(["open", "partial", "resolved", "dropped"]);

const updateSchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  hint: z.string().trim().min(1).max(6000).optional(),
  payoff: z.string().trim().max(6000).optional().nullable(),
  status: statusSchema.optional(),
  importance: z.coerce.number().int().min(0).max(100).optional(),
  plantedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  resolvedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
});

function serialize<T extends { createdAt: Date; updatedAt: Date }>(item: T) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string; foreshadowingId?: string }> },
) {
  assertSameOriginRequest(request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      foreshadowingId: rawParams.foreshadowingId ?? "",
    });
    const body = await parseJsonBody(request, updateSchema);
    const { work } = await requireWorkAccess(params.id);

    const existing = await prisma.foreshadowing.findFirst({
      where: { id: params.foreshadowingId, novelId: work.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new AuthApiError(404, "伏笔不存在。");
    }

    const foreshadowing = await prisma.foreshadowing.update({
      where: { id: existing.id },
      data: {
        title: body.title === undefined ? undefined : body.title || null,
        description: body.description === undefined ? undefined : body.description || null,
        hint: body.hint,
        payoff: body.payoff === undefined ? undefined : body.payoff || null,
        status: body.status,
        importance: body.importance,
        plantedChapter: body.plantedChapter,
        resolvedChapter: body.resolvedChapter,
      },
    });

    return successResponse(
      { foreshadowing: serialize(foreshadowing) },
      { message: "伏笔已更新。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string; foreshadowingId?: string }> },
) {
  assertSameOriginRequest(_request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      foreshadowingId: rawParams.foreshadowingId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const result = await prisma.foreshadowing.updateMany({
      where: { id: params.foreshadowingId, novelId: work.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AuthApiError(404, "伏笔不存在。");
    }

    return successResponse({ id: params.foreshadowingId }, { message: "伏笔已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

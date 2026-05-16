import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  eventId: z.string().min(1).max(64),
});

const updateSchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  summary: z.string().trim().max(6000).optional(),
  storyTime: z.string().trim().max(120).optional().nullable(),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  order: z.coerce.number().int().min(0).max(999999).optional(),
  canonical: z.boolean().optional(),
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
  context: { params: Promise<{ id?: string; eventId?: string }> },
) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      eventId: rawParams.eventId ?? "",
    });
    const body = await parseJsonBody(request, updateSchema);
    const { work } = await requireWorkAccess(params.id);

    const existing = await prisma.timelineEvent.findFirst({
      where: { id: params.eventId, novelId: work.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new AuthApiError(404, "时间线事件不存在。");
    }

    const event = await prisma.timelineEvent.update({
      where: { id: existing.id },
      data: {
        title: body.title === undefined ? undefined : body.title || null,
        description: body.description === undefined ? undefined : body.description || null,
        summary: body.summary,
        storyTime: body.storyTime === undefined ? undefined : body.storyTime || null,
        chapterIndex: body.chapterIndex,
        order: body.order,
        canonical: body.canonical,
      },
    });

    return successResponse({ event: serialize(event) }, { message: "时间线事件已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string; eventId?: string }> },
) {
  try {
    assertSameOriginRequest(_request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      eventId: rawParams.eventId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const result = await prisma.timelineEvent.updateMany({
      where: { id: params.eventId, novelId: work.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AuthApiError(404, "时间线事件不存在。");
    }

    return successResponse({ id: params.eventId }, { message: "时间线事件已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

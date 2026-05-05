import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

const eventSchema = z.object({
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const { work } = await requireWorkAccess(params.id);

    const events = await prisma.timelineEvent.findMany({
      where: { novelId: work.id, deletedAt: null },
      orderBy: [{ chapterIndex: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });

    return successResponse({ events: events.map(serialize) }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, eventSchema);
    const { work } = await requireWorkAccess(params.id);
    const summary = body.summary || body.description || body.title || "未命名事件";

    const event = await prisma.timelineEvent.create({
      data: {
        novelId: work.id,
        title: body.title || null,
        description: body.description || null,
        summary,
        storyTime: body.storyTime || null,
        chapterIndex: body.chapterIndex ?? null,
        order: body.order ?? 0,
        canonical: body.canonical ?? true,
      },
    });

    return successResponse({ event: serialize(event) }, { message: "时间线事件已创建。" });
  } catch (error) {
    return errorResponse(error);
  }
}

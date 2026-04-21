import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const updateSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  content: z.string().min(10).max(4000).optional(),
  source: z.enum(["seed", "ai", "user", "learned"]).optional(),
  isActive: z.boolean().optional(),
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
    const template = await prisma.createTemplate.update({
      where: { id: params.id },
      data: {
        title: body.title === undefined ? undefined : body.title,
        content: body.content,
        source: body.source,
        isActive: body.isActive,
      },
      select: {
        id: true,
        genreId: true,
        title: true,
        content: true,
        source: true,
        usageCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse({ template }, { message: "模板已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    await prisma.createTemplate.delete({ where: { id: params.id } });
    return successResponse({ id: params.id }, { message: "模板已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

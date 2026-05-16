import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";

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
  assertSameOriginRequest(request);
  try {
    const adminUser = await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const body = await parseJsonBody(request, updateSchema);
    const before = await prisma.createTemplate.findUnique({ where: { id: params.id } });
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
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "template.update",
      targetType: "CreateTemplate",
      targetId: params.id,
      before,
      after: template,
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
  assertSameOriginRequest(_request);
  try {
    const adminUser = await requireAdminUser();

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const before = await prisma.createTemplate.findUnique({ where: { id: params.id } });
    await prisma.createTemplate.delete({ where: { id: params.id } });
    await recordAdminAuditLog({
      request: _request,
      adminUser,
      action: "template.delete",
      targetType: "CreateTemplate",
      targetId: params.id,
      before,
    });
    return successResponse({ id: params.id }, { message: "模板已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  settingId: z.string().min(1).max(64),
});

const updateSchema = z.object({
  kind: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  desc: z.string().trim().max(6000).optional(),
  firstChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  lastUpdatedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
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
  context: { params: Promise<{ id?: string; settingId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      settingId: rawParams.settingId ?? "",
    });
    const body = await parseJsonBody(request, updateSchema);
    const { work } = await requireWorkAccess(params.id);

    const existing = await prisma.worldSetting.findFirst({
      where: { id: params.settingId, novelId: work.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new AuthApiError(404, "设定不存在。");
    }

    const setting = await prisma.worldSetting.update({
      where: { id: existing.id },
      data: {
        kind: body.kind,
        name: body.name,
        desc: body.desc,
        firstChapter: body.firstChapter,
        lastUpdatedChapter: body.lastUpdatedChapter,
      },
    });

    return successResponse({ setting: serialize(setting) }, { message: "设定已更新。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string; settingId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      settingId: rawParams.settingId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const result = await prisma.worldSetting.updateMany({
      where: { id: params.settingId, novelId: work.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AuthApiError(404, "设定不存在。");
    }

    return successResponse({ id: params.settingId }, { message: "设定已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

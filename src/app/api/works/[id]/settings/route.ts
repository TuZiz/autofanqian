import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

const settingSchema = z.object({
  kind: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
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

export async function GET(request: Request, context: { params: Promise<{ id?: string }> }) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const kind = new URL(request.url).searchParams.get("kind")?.trim();
    const { work } = await requireWorkAccess(params.id);

    const settings = await prisma.worldSetting.findMany({
      where: {
        novelId: work.id,
        deletedAt: null,
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
    });

    return successResponse({ settings: settings.map(serialize) }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id?: string }> }) {
  assertSameOriginRequest(request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, settingSchema);
    const { work } = await requireWorkAccess(params.id);

    const setting = await prisma.worldSetting.create({
      data: {
        novelId: work.id,
        kind: body.kind,
        name: body.name,
        desc: body.desc || "",
        firstChapter: body.firstChapter ?? null,
        lastUpdatedChapter: body.lastUpdatedChapter ?? null,
      },
    });

    return successResponse({ setting: serialize(setting) }, { message: "设定已创建。" });
  } catch (error) {
    return errorResponse(error);
  }
}

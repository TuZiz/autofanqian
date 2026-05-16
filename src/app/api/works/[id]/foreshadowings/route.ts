import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const statusSchema = z.enum(["open", "partial", "resolved", "dropped"]);

const foreshadowingSchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(6000).optional().nullable(),
  hint: z.string().trim().min(1).max(6000),
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

export async function GET(request: Request, context: { params: Promise<{ id?: string }> }) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const status = statusSchema.safeParse(new URL(request.url).searchParams.get("status")).data;
    const { work } = await requireWorkAccess(params.id);

    const foreshadowings = await prisma.foreshadowing.findMany({
      where: {
        novelId: work.id,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });

    return successResponse(
      { foreshadowings: foreshadowings.map(serialize) },
      { message: "OK" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id?: string }> }) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, foreshadowingSchema);
    const { work } = await requireWorkAccess(params.id);

    const foreshadowing = await prisma.foreshadowing.create({
      data: {
        novelId: work.id,
        title: body.title || null,
        description: body.description || null,
        hint: body.hint,
        payoff: body.payoff || null,
        status: body.status ?? "open",
        importance: body.importance ?? 50,
        plantedChapter: body.plantedChapter ?? null,
        resolvedChapter: body.resolvedChapter ?? null,
      },
    });

    return successResponse(
      { foreshadowing: serialize(foreshadowing) },
      { message: "伏笔已创建。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

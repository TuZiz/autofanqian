import { Prisma } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

const characterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  identity: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(80).optional(),
  desc: z.string().trim().max(4000).optional(),
  personality: z.string().trim().max(2000).optional().nullable(),
  goal: z.string().trim().max(2000).optional().nullable(),
  secret: z.string().trim().max(2000).optional().nullable(),
  appearance: z.string().trim().max(2000).optional().nullable(),
  relations: z.unknown().optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

function serialize<T extends { createdAt: Date; updatedAt: Date }>(item: T) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toNullableJson(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const { work } = await requireWorkAccess(params.id);

    const characters = await prisma.character.findMany({
      where: { novelId: work.id, deletedAt: null },
      orderBy: [{ lastChapter: "desc" }, { updatedAt: "desc" }],
    });

    return successResponse({ characters: characters.map(serialize) }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const body = await parseJsonBody(request, characterSchema);
    const { work } = await requireWorkAccess(params.id);

    const character = await prisma.character.create({
      data: {
        novelId: work.id,
        name: body.name,
        aliases: body.aliases ?? [],
        identity: body.identity || null,
        role: body.role || "supporting",
        desc: body.desc || "",
        personality: body.personality || null,
        goal: body.goal || null,
        secret: body.secret || null,
        appearance: body.appearance || null,
        relations: toNullableJson(body.relations),
        notes: body.notes || null,
      },
    });

    return successResponse(
      { character: serialize(character) },
      { message: "角色已创建。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

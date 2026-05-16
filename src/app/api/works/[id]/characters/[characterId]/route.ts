import { Prisma } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  characterId: z.string().min(1).max(64),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id?: string; characterId?: string }> },
) {
  assertSameOriginRequest(request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      characterId: rawParams.characterId ?? "",
    });
    const body = await parseJsonBody(request, updateSchema);
    const { work } = await requireWorkAccess(params.id);

    const existing = await prisma.character.findFirst({
      where: { id: params.characterId, novelId: work.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new AuthApiError(404, "角色不存在。");
    }

    const character = await prisma.character.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        aliases: body.aliases,
        identity: body.identity === undefined ? undefined : body.identity || null,
        role: body.role,
        desc: body.desc,
        personality: body.personality === undefined ? undefined : body.personality || null,
        goal: body.goal === undefined ? undefined : body.goal || null,
        secret: body.secret === undefined ? undefined : body.secret || null,
        appearance: body.appearance === undefined ? undefined : body.appearance || null,
        relations: toNullableJson(body.relations),
        notes: body.notes === undefined ? undefined : body.notes || null,
      },
    });

    return successResponse(
      { character: serialize(character) },
      { message: "角色已更新。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string; characterId?: string }> },
) {
  assertSameOriginRequest(_request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      characterId: rawParams.characterId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const result = await prisma.character.updateMany({
      where: { id: params.characterId, novelId: work.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new AuthApiError(404, "角色不存在。");
    }

    return successResponse({ id: params.characterId }, { message: "角色已删除。" });
  } catch (error) {
    return errorResponse(error);
  }
}

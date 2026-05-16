import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
});

const draftSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  content: z.string().max(200_000).optional(),
  summary: z.string().max(12_000).optional().nullable(),
  chapterOutline: z.string().max(24_000).optional().nullable(),
  details: z.array(z.string().trim().min(1).max(400)).max(200).optional().nullable(),
});

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function serializeDraft<T extends { createdAt: Date; updatedAt: Date }>(draft: T) {
  return {
    ...draft,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const { work } = await requireWorkAccess(params.id);

    const draft = await prisma.chapterDraft.findUnique({
      where: { workId_index: { workId: work.id, index: params.index } },
    });

    return successResponse(
      { draft: draft ? serializeDraft(draft) : null },
      { message: "OK" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  assertSameOriginRequest(request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const body = await parseJsonBody(request, draftSchema);
    const { work } = await requireWorkAccess(params.id);

    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: params.index } },
      select: { id: true, deletedAt: true },
    });

    if (chapter?.deletedAt) {
      throw new AuthApiError(410, "章节已删除，请先恢复后再编辑。");
    }

    const content = typeof body.content === "string" ? body.content : "";
    const details =
      body.details === undefined
        ? undefined
        : (body.details ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 200);
    const draft = await prisma.chapterDraft.upsert({
      where: { workId_index: { workId: work.id, index: params.index } },
      create: {
        workId: work.id,
        chapterId: chapter?.id ?? null,
        index: params.index,
        title: body.title?.trim() || null,
        content,
        wordCount: countWords(content),
        summary: body.summary?.trim() || null,
        chapterOutline: body.chapterOutline?.trim() || null,
        details: details ?? [],
        isSynced: false,
      },
      update: {
        chapterId: chapter?.id ?? null,
        title: body.title === undefined ? undefined : body.title?.trim() || null,
        content: body.content === undefined ? undefined : content,
        wordCount: body.content === undefined ? undefined : countWords(content),
        summary: body.summary === undefined ? undefined : body.summary?.trim() || null,
        chapterOutline:
          body.chapterOutline === undefined ? undefined : body.chapterOutline?.trim() || null,
        details,
        isSynced: false,
      },
    });

    return successResponse(
      { draft: serializeDraft(draft) },
      { message: "草稿已保存。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  assertSameOriginRequest(_request);
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const { work } = await requireWorkAccess(params.id);

    await prisma.chapterDraft.deleteMany({
      where: { workId: work.id, index: params.index },
    });

    return successResponse({ cleared: true }, { message: "草稿已清理。" });
  } catch (error) {
    return errorResponse(error);
  }
}

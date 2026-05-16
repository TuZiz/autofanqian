import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { createChapterRevisionSnapshot } from "@/lib/workbench/chapter-revisions";
import { requireWorkAccess } from "@/lib/works/access";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  revisionId: z.string().min(1).max(64),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string; revisionId?: string }> },
) {
  try {
    assertSameOriginRequest(_request);
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      index: rawParams.index ?? "",
      revisionId: rawParams.revisionId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const revision = await prisma.chapterRevision.findFirst({
      where: {
        id: params.revisionId,
        workId: work.id,
        index: params.index,
      },
    });

    if (!revision) {
      throw new AuthApiError(404, "历史版本不存在。");
    }

    const chapter = await prisma.$transaction(async (tx) => {
      await createChapterRevisionSnapshot({
        client: tx,
        workId: work.id,
        index: params.index,
        source: "restore_before",
      });

      const restoredChapter = await tx.chapter.upsert({
        where: { workId_index: { workId: work.id, index: params.index } },
        create: {
          workId: work.id,
          index: params.index,
          title: revision.title,
          content: revision.content,
          wordCount: revision.wordCount,
          summary: revision.summary,
          chapterOutline: revision.chapterOutline,
          details: revision.details ?? undefined,
          status: revision.wordCount > 0 ? "written" : "planned",
          deletedAt: null,
        },
        update: {
          title: revision.title,
          content: revision.content,
          wordCount: revision.wordCount,
          summary: revision.summary,
          chapterOutline: revision.chapterOutline,
          details: revision.details ?? undefined,
          status: revision.wordCount > 0 ? "written" : "planned",
          deletedAt: null,
        },
        select: {
          id: true,
          index: true,
          title: true,
          content: true,
          wordCount: true,
          summary: true,
          chapterOutline: true,
          details: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      await tx.chapterDraft.deleteMany({
        where: { workId: work.id, index: params.index },
      });

      return restoredChapter;
    });

    return successResponse(
      {
        chapter: {
          ...chapter,
          createdAt: chapter.createdAt.toISOString(),
          updatedAt: chapter.updatedAt.toISOString(),
        },
      },
      { message: "历史版本已恢复。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

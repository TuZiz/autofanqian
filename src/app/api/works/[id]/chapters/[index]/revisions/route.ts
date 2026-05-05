import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { serializeRevision } from "@/lib/workbench/chapter-revisions";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const { work } = await requireWorkAccess(params.id);

    const chapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId: work.id, index: params.index } },
      select: { id: true },
    });

    if (!chapter) {
      throw new AuthApiError(404, "章节不存在。");
    }

    const revisions = await prisma.chapterRevision.findMany({
      where: { workId: work.id, index: params.index },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        index: true,
        title: true,
        wordCount: true,
        source: true,
        reason: true,
        createdAt: true,
      },
    });

    return successResponse(
      { revisions: revisions.map(serializeRevision) },
      { message: "OK" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

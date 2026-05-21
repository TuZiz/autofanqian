import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { inspectExportChapters } from "@/lib/export/work-export";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { workExportPreviewQuerySchema } from "@/shared/schemas/work-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const query = workExportPreviewQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (query.scope === "chapter" && !query.chapterIndex) {
      throw new AuthApiError(400, "预检当前章节导出时必须提供 chapterIndex。");
    }

    const { work } = await requireWorkAccess(params.id);
    const chapterWhere =
      query.scope === "chapter"
        ? { deletedAt: null, index: query.chapterIndex }
        : { deletedAt: null };
    const fullWork = await prisma.work.findUnique({
      where: { id: work.id },
      select: {
        chapters: {
          where: chapterWhere,
          orderBy: { index: "asc" },
          select: { index: true, title: true, content: true, wordCount: true },
        },
      },
    });

    if (!fullWork) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }
    if (!fullWork.chapters.length) {
      throw new AuthApiError(404, "没有可导出的章节。");
    }

    return successResponse(inspectExportChapters(fullWork.chapters, query.scope), {
      message: "OK",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

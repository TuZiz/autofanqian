import { z } from "zod";

import { errorResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { buildDocxBuffer } from "@/lib/export/docx";
import {
  buildMarkdownExport,
  buildTxtExport,
  formatExportDate,
  getExportScopeLabel,
  inspectExportChapters,
  sanitizeExportFilename,
} from "@/lib/export/work-export";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";
import { workExportQuerySchema } from "@/shared/schemas/work-export";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const query = workExportQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    if (query.scope === "chapter" && !query.chapterIndex) {
      throw new AuthApiError(400, "导出当前章节时必须提供 chapterIndex。");
    }
    if (query.format === "epub") {
      throw new AuthApiError(501, "EPUB 导出接口已预留，本轮暂未开放。");
    }

    const { work } = await requireWorkAccess(params.id);
    const chapterWhere =
      query.scope === "chapter"
        ? { deletedAt: null, index: query.chapterIndex }
        : { deletedAt: null };
    const fullWork = await prisma.work.findUnique({
      where: { id: work.id },
      select: {
        title: true,
        synopsis: true,
        workType: true,
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

    const preview = inspectExportChapters(fullWork.chapters, query.scope);
    const isMarkdown = query.format === "markdown" || query.format === "md";
    const isDocx = query.format === "docx";
    const extension = isDocx ? "docx" : isMarkdown ? "md" : "txt";
    const scopeLabel = getExportScopeLabel(query.scope, fullWork.workType, query.chapterIndex);
    const filename = `${sanitizeExportFilename(fullWork.title)}-${scopeLabel}-${formatExportDate()}.${extension}`;
    const headers = new Headers({
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-export-warnings": encodeURIComponent(JSON.stringify(preview.warnings)),
    });

    if (isDocx) {
      const buffer = buildDocxBuffer(fullWork);
      headers.set(
        "content-type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      return new Response(new Uint8Array(buffer), { status: 200, headers });
    }

    const content = isMarkdown ? buildMarkdownExport(fullWork) : buildTxtExport(fullWork);
    headers.set("content-type", `text/${isMarkdown ? "markdown" : "plain"}; charset=utf-8`);
    return new Response(content, { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}

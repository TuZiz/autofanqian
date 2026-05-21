import { z } from "zod";

import { errorResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const exportQuerySchema = z.object({
  format: z.enum(["txt", "markdown", "md"]).default("txt"),
  scope: z.enum(["book", "chapter", "short_story"]).default("book"),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
});

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "novel";
}

function formatDateForFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getChapterHeading(workType: string, index: number, title: string | null) {
  const prefix = workType === "short_story" ? `场景${index}` : `第${index}章`;
  return `${prefix} ${title || ""}`.trim();
}

function buildTxt(work: {
  title: string;
  synopsis: string;
  workType: string;
  chapters: Array<{ index: number; title: string | null; content: string }>;
}) {
  return [
    work.title,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      getChapterHeading(work.workType, chapter.index, chapter.title),
      "",
      chapter.content,
      "",
    ]),
  ].join("\n");
}

function buildMarkdown(work: {
  title: string;
  synopsis: string;
  workType: string;
  chapters: Array<{ index: number; title: string | null; content: string }>;
}) {
  return [
    `# ${work.title}`,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      `## ${getChapterHeading(work.workType, chapter.index, chapter.title)}`,
      "",
      chapter.content,
      "",
    ]),
  ].join("\n");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const query = exportQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const format = query.format;
    if (query.scope === "chapter" && !query.chapterIndex) {
      throw new AuthApiError(400, "导出当前章节时必须提供 chapterIndex。");
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
          select: { index: true, title: true, content: true },
        },
      },
    });

    if (!fullWork) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }
    if (!fullWork.chapters.length) {
      throw new AuthApiError(404, "没有可导出的章节。");
    }

    const isMarkdown = format === "markdown" || format === "md";
    const content = isMarkdown ? buildMarkdown(fullWork) : buildTxt(fullWork);
    const extension = isMarkdown ? "md" : "txt";
    const scopeLabel =
      query.scope === "chapter"
        ? `第${query.chapterIndex}章`
        : fullWork.workType === "short_story" || query.scope === "short_story"
          ? "短篇"
          : "全书";
    const filename = `${sanitizeFilename(fullWork.title)}-${scopeLabel}-${formatDateForFilename()}.${extension}`;

    return new Response(content, {
      status: 200,
      headers: {
        "content-type": `text/${isMarkdown ? "markdown" : "plain"}; charset=utf-8`,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

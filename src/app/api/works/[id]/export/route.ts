import { z } from "zod";

import { errorResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { buildDocxBuffer } from "@/lib/export/docx";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const exportQuerySchema = z.object({
  format: z.enum(["txt", "markdown", "md", "docx", "epub"]).default("txt"),
  scope: z.enum(["book", "chapter", "short_story"]).default("book"),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
});

type ExportChapter = { index: number; title: string | null; content: string };
type ExportWork = {
  title: string;
  synopsis: string;
  workType: string;
  chapters: ExportChapter[];
};

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
  const prefix = workType === "short_story" ? `场景 ${index}` : `第 ${index} 章`;
  return `${prefix} ${title || ""}`.trim();
}

function buildTxt(work: ExportWork) {
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

function buildMarkdown(work: ExportWork) {
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

function inspectExportChapters(chapters: ExportChapter[], scope: string) {
  const warnings: string[] = [];
  const empty = chapters
    .filter((chapter) => !chapter.content.trim())
    .map((chapter) => chapter.index);
  if (empty.length) {
    warnings.push(`存在空章节/场景：${empty.join("、")}。`);
  }

  if (scope !== "chapter" && chapters.length > 1) {
    const indexes = chapters.map((chapter) => chapter.index).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = indexes[0]; i <= indexes[indexes.length - 1]; i += 1) {
      if (!indexes.includes(i)) gaps.push(i);
    }
    if (gaps.length) {
      warnings.push(`章节序号存在断裂：缺少 ${gaps.slice(0, 20).join("、")}${gaps.length > 20 ? " 等" : ""}。`);
    }
  }

  return warnings;
}

function getScopeLabel(scope: string, workType: string, chapterIndex?: number) {
  if (scope === "chapter") return `第${chapterIndex}章`;
  if (workType === "short_story" || scope === "short_story") return "短篇";
  return "全书";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const query = exportQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

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

    const warnings = inspectExportChapters(fullWork.chapters, query.scope);
    const isMarkdown = query.format === "markdown" || query.format === "md";
    const isDocx = query.format === "docx";
    const extension = isDocx ? "docx" : isMarkdown ? "md" : "txt";
    const scopeLabel = getScopeLabel(query.scope, fullWork.workType, query.chapterIndex);
    const filename = `${sanitizeFilename(fullWork.title)}-${scopeLabel}-${formatDateForFilename()}.${extension}`;
    const headers = new Headers({
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-export-warnings": encodeURIComponent(JSON.stringify(warnings)),
    });

    if (isDocx) {
      const buffer = buildDocxBuffer(fullWork);
      headers.set(
        "content-type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      return new Response(new Uint8Array(buffer), { status: 200, headers });
    }

    const content = isMarkdown ? buildMarkdown(fullWork) : buildTxt(fullWork);
    headers.set("content-type", `text/${isMarkdown ? "markdown" : "plain"}; charset=utf-8`);
    return new Response(content, { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}

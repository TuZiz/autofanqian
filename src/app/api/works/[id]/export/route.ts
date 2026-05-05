import { z } from "zod";

import { errorResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "novel";
}

function buildTxt(work: {
  title: string;
  synopsis: string;
  chapters: Array<{ index: number; title: string | null; content: string }>;
}) {
  return [
    work.title,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      `第${chapter.index}章 ${chapter.title || ""}`.trim(),
      "",
      chapter.content,
      "",
    ]),
  ].join("\n");
}

function buildMarkdown(work: {
  title: string;
  synopsis: string;
  chapters: Array<{ index: number; title: string | null; content: string }>;
}) {
  return [
    `# ${work.title}`,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      `## 第${chapter.index}章 ${chapter.title || ""}`.trim(),
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
    const format = new URL(request.url).searchParams.get("format") || "txt";
    if (format !== "txt" && format !== "markdown" && format !== "md") {
      throw new AuthApiError(400, "暂时只支持导出 TXT 或 Markdown。");
    }

    const { work } = await requireWorkAccess(params.id);
    const fullWork = await prisma.work.findUnique({
      where: { id: work.id },
      select: {
        title: true,
        synopsis: true,
        chapters: {
          where: { deletedAt: null },
          orderBy: { index: "asc" },
          select: { index: true, title: true, content: true },
        },
      },
    });

    if (!fullWork) {
      throw new AuthApiError(404, "作品不存在或已被删除。");
    }

    const isMarkdown = format === "markdown" || format === "md";
    const content = isMarkdown ? buildMarkdown(fullWork) : buildTxt(fullWork);
    const extension = isMarkdown ? "md" : "txt";
    const filename = `${sanitizeFilename(fullWork.title)}.${extension}`;

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

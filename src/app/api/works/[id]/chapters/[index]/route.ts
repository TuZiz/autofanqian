import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(999),
});

const updateSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  content: z.string().max(200_000).optional(),
  summary: z.string().max(12_000).optional().nullable(),
  chapterOutline: z.string().max(24_000).optional().nullable(),
  details: z.array(z.string().trim().min(1).max(400)).max(200).optional().nullable(),
});

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function getDefaultChapterTitle(index: number) {
  if (index === 1) return "第一章";
  return `第${index}章`;
}

async function requireWorkAccess(params: { workId: string; userId: string; isAdmin: boolean }) {
  const work = await prisma.work.findUnique({
    where: { id: params.workId },
    select: {
      id: true,
      userId: true,
      title: true,
      tag: true,
      outline: true,
    },
  });

  if (!work) {
    throw new AuthApiError(404, "作品不存在或已被删除。");
  }

  if (!params.isAdmin && work.userId !== params.userId) {
    throw new AuthApiError(403, "无权限访问该作品。");
  }

  return work;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const parsed = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });

    const isAdmin = isAdminEmail(user.email);
    const work = await requireWorkAccess({ workId: parsed.id, userId: user.id, isAdmin });

    const chapter = await prisma.chapter.upsert({
      where: { workId_index: { workId: work.id, index: parsed.index } },
      create: {
        workId: work.id,
        index: parsed.index,
        title: getDefaultChapterTitle(parsed.index),
        content: "",
        wordCount: 0,
        details: [],
      },
      update: {},
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

    return successResponse(
      {
        work: {
          id: work.id,
          title: work.title,
          tag: work.tag,
          outline: work.outline,
        },
        chapter: {
          ...chapter,
          createdAt: chapter.createdAt.toISOString(),
          updatedAt: chapter.updatedAt.toISOString(),
        },
      },
      { message: "OK" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id?: string; index?: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const parsed = paramsSchema.parse({ id: rawParams.id ?? "", index: rawParams.index ?? "" });
    const body = await parseJsonBody(request, updateSchema);

    const isAdmin = isAdminEmail(user.email);
    const work = await requireWorkAccess({ workId: parsed.id, userId: user.id, isAdmin });

    let nextTitle: string | null | undefined = undefined;
    if (body.title !== undefined) {
      const trimmed = typeof body.title === "string" ? body.title.trim() : "";
      nextTitle = trimmed ? trimmed : null;
    }

    const nextContent = body.content;
    const nextWordCount = typeof nextContent === "string" ? countWords(nextContent) : undefined;

    let nextSummary: string | null | undefined = undefined;
    if (body.summary !== undefined) {
      const trimmed = typeof body.summary === "string" ? body.summary.trim() : "";
      nextSummary = trimmed ? trimmed : null;
    }

    let nextChapterOutline: string | null | undefined = undefined;
    if (body.chapterOutline !== undefined) {
      const trimmed =
        typeof body.chapterOutline === "string" ? body.chapterOutline.trim() : "";
      nextChapterOutline = trimmed ? trimmed : null;
    }

    let nextDetails: string[] | undefined = undefined;
    if (body.details !== undefined) {
      const rawDetails = Array.isArray(body.details) ? body.details : [];
      nextDetails = rawDetails.map((item) => item.trim()).filter(Boolean).slice(0, 200);
    }

    const chapter = await prisma.chapter.upsert({
      where: { workId_index: { workId: work.id, index: parsed.index } },
      create: {
        workId: work.id,
        index: parsed.index,
        title: nextTitle ?? getDefaultChapterTitle(parsed.index),
        content: nextContent ?? "",
        wordCount: typeof nextWordCount === "number" ? nextWordCount : 0,
        summary: nextSummary ?? null,
        chapterOutline: nextChapterOutline ?? null,
        details: nextDetails ?? [],
      },
      update: {
        title: nextTitle,
        content: nextContent,
        wordCount: typeof nextWordCount === "number" ? nextWordCount : undefined,
        summary: nextSummary,
        chapterOutline: nextChapterOutline,
        details: nextDetails,
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

    return successResponse(
      {
        work: {
          id: work.id,
          title: work.title,
          tag: work.tag,
        },
        chapter: {
          ...chapter,
          createdAt: chapter.createdAt.toISOString(),
          updatedAt: chapter.updatedAt.toISOString(),
        },
      },
      { message: "已保存。" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据库未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

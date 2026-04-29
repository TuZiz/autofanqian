import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

type ChapterProgressItem = {
  index: number;
  wordCount: number;
};

async function requireWorkAccess(params: {
  workId: string;
  userId: string;
  isAdmin: boolean;
}) {
  const work = await prisma.work.findUnique({
    where: { id: params.workId },
    select: {
      id: true,
      userId: true,
      title: true,
      tag: true,
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

function getSequentialChapterProgress(chapters: ChapterProgressItem[]) {
  const byIndex = new Map(chapters.map((chapter) => [chapter.index, chapter]));
  const maxIndex = chapters.reduce((max, chapter) => Math.max(max, chapter.index), 0);

  for (let index = 1; index <= maxIndex; index += 1) {
    const chapter = byIndex.get(index);
    if (!chapter || chapter.wordCount <= 0) {
      return {
        lastEditedIndex: index - 1,
        nextIndex: index,
      };
    }
  }

  return {
    lastEditedIndex: maxIndex,
    nextIndex: Math.max(1, maxIndex + 1),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });

    const isAdmin = isAdminEmail(user.email);
    const work = await requireWorkAccess({ workId: params.id, userId: user.id, isAdmin });

    const chapters = await prisma.chapter.findMany({
      where: { workId: work.id },
      orderBy: { index: "asc" },
      select: {
        id: true,
        index: true,
        title: true,
        wordCount: true,
        summary: true,
        chapterOutline: true,
        details: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const maxIndex = chapters.reduce((max, chapter) => Math.max(max, chapter.index), 0);
    const { lastEditedIndex, nextIndex } = getSequentialChapterProgress(chapters);

    return successResponse(
      {
        work: {
          id: work.id,
          title: work.title,
          tag: work.tag,
        },
        nextIndex,
        maxIndex,
        lastEditedIndex,
        chapters: chapters.map((chapter) => ({
          ...chapter,
          createdAt: chapter.createdAt.toISOString(),
          updatedAt: chapter.updatedAt.toISOString(),
          details: chapter.details ?? [],
        })),
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

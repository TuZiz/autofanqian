import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminEmail } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/service";
import {
  normalizeStoryOutline,
  storyOutlineSchema,
} from "@/lib/create/outline-schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const draftSchema = z.object({
  genre: z.string().min(1).max(64),
  genreLabel: z.string().max(64).optional(),
  idea: z.string().min(10).max(2000),
  tags: z.array(z.string().min(1).max(24)).max(12).optional(),
  platform: z.string().max(64).optional(),
  platformLabel: z.string().max(64).optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().max(40).optional(),
});

const bodySchema = z.object({
  draft: draftSchema,
  story: storyOutlineSchema,
});

function parseTargetWordCount(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;

  const amount = Number.parseFloat(numberMatch[1] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (normalized.includes("w") || normalized.includes("万")) {
    return Math.round(amount * 10_000);
  }

  return Math.round(amount);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const isAdmin = isAdminEmail(user.email);

    const works = await prisma.work.findMany({
      where: isAdmin ? {} : { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        title: true,
        tag: true,
        words: true,
        genreLabel: true,
        genreId: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            code: true,
            email: true,
          },
        },
        chapters: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            index: true,
            title: true,
            wordCount: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    const totals = works.reduce(
      (acc, work) => {
        const writtenChapters = work.chapters.filter((chapter) => chapter.wordCount > 0);
        acc.totalWords += writtenChapters.reduce(
          (sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0),
          0,
        );
        acc.chapterCount += writtenChapters.length;
        return acc;
      },
      { totalWords: 0, chapterCount: 0 },
    );

    const candidates = works.flatMap((work) =>
      work.chapters
        .filter((chapter) => chapter.wordCount > 0)
        .map((chapter) => ({ work, chapter })),
    );

    candidates.sort(
      (a, b) => b.chapter.updatedAt.getTime() - a.chapter.updatedAt.getTime(),
    );

    const latest = candidates[0];
    const fallbackWork = works[0];
    const activeWork = latest?.work ?? fallbackWork ?? null;
    const activeChapter = latest?.chapter ?? null;
    const workWordCount = activeWork
      ? activeWork.chapters
          .filter((chapter) => chapter.wordCount > 0)
          .reduce((sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0), 0)
      : 0;
    const targetWordCount = parseTargetWordCount(activeWork?.words);
    const completionPercent = targetWordCount
      ? Math.max(0, Math.min(100, Math.round((workWordCount / targetWordCount) * 100)))
      : workWordCount > 0
        ? 1
        : 0;
    const workSummaries = works.map((work) => {
      const writtenChapters = work.chapters.filter((chapter) => chapter.wordCount > 0);
      const wordCount = writtenChapters.reduce(
        (sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0),
        0,
      );
      const latestChapter = writtenChapters[0] ?? work.chapters[0] ?? null;
      const target = parseTargetWordCount(work.words);
      const workCompletionPercent = target
        ? Math.max(0, Math.min(100, Math.round((wordCount / target) * 100)))
        : wordCount > 0
          ? 1
          : 0;

      return {
        id: work.id,
        title: work.title,
        tag: work.tag,
        genreLabel: work.genreLabel || work.genreId,
        words: work.words,
        wordCount,
        chapterCount: writtenChapters.length,
        completionPercent: workCompletionPercent,
        updatedAt: (latestChapter?.updatedAt ?? work.updatedAt).toISOString(),
        owner: {
          id: work.userId,
          code: work.user.code,
          email: work.user.email,
        },
        chapter: {
          index: latestChapter?.index ?? 1,
          title: latestChapter?.title ?? null,
          wordCount: latestChapter?.wordCount ?? 0,
        },
      };
    });

    return successResponse(
      {
        stats: {
          totalWords: totals.totalWords,
          chapterCount: totals.chapterCount,
          workCount: works.length,
        },
        activeWork: activeWork
          ? {
              id: activeWork.id,
              title: activeWork.title,
              tag: activeWork.tag,
              words: activeWork.words,
              wordCount: workWordCount,
              completionPercent,
              updatedAt: (activeChapter?.updatedAt ?? activeWork.updatedAt).toISOString(),
              chapter: {
                index: activeChapter?.index ?? 1,
                title: activeChapter?.title ?? null,
                wordCount: activeChapter?.wordCount ?? 0,
              },
            }
          : null,
        works: workSummaries,
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, bodySchema);

    const story = normalizeStoryOutline(body.story);

    const work = await prisma.work.create({
      data: {
        userId: user.id,
        genreId: body.draft.genre,
        genreLabel: body.draft.genreLabel?.trim() || null,
        idea: body.draft.idea,
        tags: body.draft.tags ?? [],
        platformId: body.draft.platform?.trim() || null,
        platformLabel: body.draft.platformLabel?.trim() || null,
        words: body.draft.words?.trim() || null,
        dnaBookTitle: body.draft.dnaBookTitle?.trim() || null,
        tag: story.tag,
        title: story.title,
        synopsis: story.synopsis,
        outline: story,
      },
      select: { id: true },
    });

    return successResponse(
      { workId: work.id },
      { message: "作品已创建。" },
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

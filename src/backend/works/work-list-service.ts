import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { WorkListQuery, WorkListSort } from "@/shared/schemas/work-api";
import { matchesWorkLibraryTypeFilter } from "@/shared/work-type";

type ListWorksParams = {
  isAdmin: boolean;
  query: WorkListQuery;
  userId: string;
};

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

function buildWorkWhere({ isAdmin, query, userId }: ListWorksParams) {
  const and: Prisma.WorkWhereInput[] = [{ deletedAt: null }];

  if (!isAdmin) {
    and.push({ userId });
  }

  if (query.genreId) {
    and.push({
      OR: [
        { genreId: query.genreId },
        { genreLabel: { contains: query.genreId, mode: "insensitive" } },
      ],
    });
  }

  if (query.tag) {
    and.push({
      OR: [
        { tag: { contains: query.tag, mode: "insensitive" } },
        { tags: { has: query.tag } },
      ],
    });
  }

  if (query.owner && isAdmin) {
    const ownerCode = /^\d+$/.test(query.owner) ? Number(query.owner) : null;
    and.push({
      user: {
        OR: [
          { email: { contains: query.owner, mode: "insensitive" } },
          { name: { contains: query.owner, mode: "insensitive" } },
          ...(ownerCode ? [{ code: ownerCode }] : []),
        ],
      },
    });
  }

  if (query.q) {
    const numeric = /^\d+$/.test(query.q) ? Number(query.q) : null;
    and.push({
      OR: [
        { id: { contains: query.q } },
        { title: { contains: query.q, mode: "insensitive" } },
        { tag: { contains: query.q, mode: "insensitive" } },
        { tags: { has: query.q } },
        { genreId: { contains: query.q, mode: "insensitive" } },
        { genreLabel: { contains: query.q, mode: "insensitive" } },
        {
          user: {
            OR: [
              { email: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
              ...(numeric ? [{ code: numeric }] : []),
            ],
          },
        },
        {
          chapters: {
            some: {
              deletedAt: null,
              OR: [
                ...(numeric ? [{ index: numeric }] : []),
                { title: { contains: query.q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  return { AND: and };
}

function sortSummaries<
  T extends {
    title: string;
    wordCount: number;
    completionPercent: number;
    updatedAt: string;
    createdAt: string;
  },
>(items: T[], sort: WorkListSort) {
  const getTime = (value?: string | null) => {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };

  return items.slice().sort((left, right) => {
    switch (sort) {
      case "updated_asc":
        return getTime(left.updatedAt) - getTime(right.updatedAt);
      case "created_desc":
        return getTime(right.createdAt) - getTime(left.createdAt);
      case "created_asc":
        return getTime(left.createdAt) - getTime(right.createdAt);
      case "word_desc":
        return right.wordCount - left.wordCount;
      case "word_asc":
        return left.wordCount - right.wordCount;
      case "progress_desc":
        return right.completionPercent - left.completionPercent;
      case "progress_asc":
        return left.completionPercent - right.completionPercent;
      case "title_asc":
        return left.title.localeCompare(right.title, "zh-CN");
      case "title_desc":
        return right.title.localeCompare(left.title, "zh-CN");
      case "updated_desc":
      default:
        return getTime(right.updatedAt) - getTime(left.updatedAt);
    }
  });
}

export async function listWorksForUser(params: ListWorksParams) {
  const { query } = params;
  const works = await prisma.work.findMany({
    where: buildWorkWhere(params),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      workType: true,
      title: true,
      tag: true,
      words: true,
      targetChapters: true,
      plannedUntilChapter: true,
      genreLabel: true,
      genreId: true,
      updatedAt: true,
      createdAt: true,
      user: {
        select: {
          code: true,
          email: true,
          name: true,
        },
      },
      chapters: {
        where: { deletedAt: null },
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

  candidates.sort((a, b) => b.chapter.updatedAt.getTime() - a.chapter.updatedAt.getTime());

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
      workType: work.workType,
      title: work.title,
      tag: work.tag,
      genreLabel: work.genreLabel || work.genreId,
      words: work.words,
      targetChapters: work.targetChapters,
      plannedUntilChapter: work.plannedUntilChapter,
      wordCount,
      chapterCount: writtenChapters.length,
      completionPercent: workCompletionPercent,
      createdAt: work.createdAt.toISOString(),
      updatedAt: (latestChapter?.updatedAt ?? work.updatedAt).toISOString(),
      owner: {
        id: work.userId,
        code: work.user.code,
        email: work.user.email,
        name: work.user.name,
      },
      chapter: {
        index: latestChapter?.index ?? 1,
        title: latestChapter?.title ?? null,
        wordCount: latestChapter?.wordCount ?? 0,
      },
    };
  });

  const filteredSummaries = workSummaries.filter((work) =>
    matchesWorkLibraryTypeFilter(work.workType, query.type),
  );
  const sortedSummaries = sortSummaries(filteredSummaries, query.sort);
  const skip = (query.page - 1) * query.pageSize;
  const pagedSummaries = sortedSummaries.slice(skip, skip + query.pageSize);

  return {
    stats: {
      totalWords: totals.totalWords,
      chapterCount: totals.chapterCount,
      workCount: works.length,
    },
    activeWork: activeWork
      ? {
          id: activeWork.id,
          workType: activeWork.workType,
          title: activeWork.title,
          tag: activeWork.tag,
          words: activeWork.words,
          targetChapters: activeWork.targetChapters,
          plannedUntilChapter: activeWork.plannedUntilChapter,
          wordCount: workWordCount,
          completionPercent,
          createdAt: activeWork.createdAt.toISOString(),
          updatedAt: (activeChapter?.updatedAt ?? activeWork.updatedAt).toISOString(),
          chapter: {
            index: activeChapter?.index ?? 1,
            title: activeChapter?.title ?? null,
            wordCount: activeChapter?.wordCount ?? 0,
          },
        }
      : null,
    works: pagedSummaries,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: sortedSummaries.length,
      pageCount: Math.max(1, Math.ceil(sortedSummaries.length / query.pageSize)),
    },
  };
}

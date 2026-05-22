import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { WorkListQuery, WorkListSort } from "@/shared/schemas/work-api";

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

  if (query.type === "short") {
    and.push({ workType: "short_story" });
  }

  if (query.type === "long") {
    and.push({ workType: { not: "short_story" } });
  }

  return { AND: and };
}

function buildBaseWorkWhere({ isAdmin, userId }: Pick<ListWorksParams, "isAdmin" | "userId">) {
  const and: Prisma.WorkWhereInput[] = [{ deletedAt: null }];

  if (!isAdmin) {
    and.push({ userId });
  }

  return { AND: and };
}

function buildWorkOrderBy(sort: WorkListSort): Prisma.WorkOrderByWithRelationInput[] {
  switch (sort) {
    case "updated_asc":
      return [{ updatedAt: "asc" }, { id: "asc" }];
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "title_asc":
      return [{ title: "asc" }, { id: "asc" }];
    case "title_desc":
      return [{ title: "desc" }, { id: "asc" }];
    case "word_desc":
    case "word_asc":
    case "progress_desc":
    case "progress_asc":
    case "updated_desc":
    default:
      return [{ updatedAt: "desc" }, { id: "asc" }];
  }
}

function needsSummarySort(sort: WorkListSort) {
  return (
    sort === "word_desc" ||
    sort === "word_asc" ||
    sort === "progress_desc" ||
    sort === "progress_asc"
  );
}

function containsPattern(value: string) {
  return `%${value}%`;
}

function buildWorkIdPageSql({ isAdmin, query, userId }: ListWorksParams, skip: number) {
  const where: Prisma.Sql[] = [Prisma.sql`w."deletedAt" IS NULL`];

  if (!isAdmin) {
    where.push(Prisma.sql`w."userId" = ${userId}`);
  }

  if (query.genreId) {
    where.push(
      Prisma.sql`(w."genreId" = ${query.genreId} OR w."genreLabel" ILIKE ${containsPattern(query.genreId)})`,
    );
  }

  if (query.tag) {
    where.push(
      Prisma.sql`(w."tag" ILIKE ${containsPattern(query.tag)} OR w."tags" @> ARRAY[${query.tag}]::text[])`,
    );
  }

  if (query.owner && isAdmin) {
    const ownerCode = /^\d+$/.test(query.owner) ? Number(query.owner) : null;
    const ownerWhere = [
      Prisma.sql`u."email" ILIKE ${containsPattern(query.owner)}`,
      Prisma.sql`u."name" ILIKE ${containsPattern(query.owner)}`,
    ];
    if (ownerCode) {
      ownerWhere.push(Prisma.sql`u."code" = ${ownerCode}`);
    }
    where.push(Prisma.sql`(${Prisma.join(ownerWhere, " OR ")})`);
  }

  if (query.q) {
    const numeric = /^\d+$/.test(query.q) ? Number(query.q) : null;
    const searchWhere = [
      Prisma.sql`w."id" LIKE ${containsPattern(query.q)}`,
      Prisma.sql`w."title" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`w."tag" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`w."tags" @> ARRAY[${query.q}]::text[]`,
      Prisma.sql`w."genreId" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`w."genreLabel" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`u."email" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`u."name" ILIKE ${containsPattern(query.q)}`,
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "Chapter" search_chapter
        WHERE search_chapter."workId" = w."id"
          AND search_chapter."deletedAt" IS NULL
          AND search_chapter."title" ILIKE ${containsPattern(query.q)}
      )`,
    ];
    if (numeric) {
      searchWhere.push(Prisma.sql`u."code" = ${numeric}`);
      searchWhere.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "Chapter" search_chapter
        WHERE search_chapter."workId" = w."id"
          AND search_chapter."deletedAt" IS NULL
          AND search_chapter."index" = ${numeric}
      )`);
    }
    where.push(Prisma.sql`(${Prisma.join(searchWhere, " OR ")})`);
  }

  if (query.type === "short") {
    where.push(Prisma.sql`w."workType" = 'short_story'::"WorkType"`);
  }

  if (query.type === "long") {
    where.push(Prisma.sql`w."workType" <> 'short_story'::"WorkType"`);
  }

  const sortDirection =
    query.sort === "word_asc" || query.sort === "progress_asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;
  const sortExpression =
    query.sort === "progress_desc" || query.sort === "progress_asc"
      ? Prisma.sql`
          CASE
            WHEN NULLIF(regexp_replace(COALESCE(w."words", ''), '[^0-9.]', '', 'g'), '') IS NULL THEN
              CASE WHEN COALESCE(SUM(GREATEST(chapter."wordCount", 0)), 0) > 0 THEN 1 ELSE 0 END
            ELSE LEAST(
              100,
              ROUND(
                COALESCE(SUM(GREATEST(chapter."wordCount", 0)), 0)::numeric /
                NULLIF(
                  CASE
                    WHEN lower(COALESCE(w."words", '')) LIKE '%w%'
                      OR COALESCE(w."words", '') LIKE '%万%'
                      THEN regexp_replace(COALESCE(w."words", ''), '[^0-9.]', '', 'g')::numeric * 10000
                    ELSE regexp_replace(COALESCE(w."words", ''), '[^0-9.]', '', 'g')::numeric
                  END,
                  0
                ) * 100
              )
            )
          END
        `
      : Prisma.sql`COALESCE(SUM(GREATEST(chapter."wordCount", 0)), 0)`;

  return Prisma.sql`
    SELECT w."id"
    FROM "Work" w
    JOIN "User" u ON u."id" = w."userId"
    LEFT JOIN "Chapter" chapter
      ON chapter."workId" = w."id"
      AND chapter."deletedAt" IS NULL
      AND chapter."wordCount" > 0
    WHERE ${Prisma.join(where, " AND ")}
    GROUP BY w."id", w."words", w."updatedAt"
    ORDER BY ${sortExpression} ${sortDirection}, w."updatedAt" DESC, w."id" ASC
    LIMIT ${query.pageSize}
    OFFSET ${skip}
  `;
}

function buildStatsSql({ isAdmin, userId }: Pick<ListWorksParams, "isAdmin" | "userId">) {
  const where: Prisma.Sql[] = [Prisma.sql`w."deletedAt" IS NULL`];

  if (!isAdmin) {
    where.push(Prisma.sql`w."userId" = ${userId}`);
  }

  return Prisma.sql`
    SELECT
      COALESCE(SUM(GREATEST(chapter."wordCount", 0)), 0)::int AS "totalWords",
      COUNT(chapter."id")::int AS "chapterCount",
      COUNT(DISTINCT w."id")::int AS "workCount"
    FROM "Work" w
    LEFT JOIN "Chapter" chapter
      ON chapter."workId" = w."id"
      AND chapter."deletedAt" IS NULL
      AND chapter."wordCount" > 0
    WHERE ${Prisma.join(where, " AND ")}
  `;
}

const workListSelect = {
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
} satisfies Prisma.WorkSelect;

type WorkListRow = Prisma.WorkGetPayload<{ select: typeof workListSelect }>;

function summarizeWork(work: WorkListRow) {
  const writtenChapters = work.chapters.filter((chapter) => chapter.wordCount > 0);
  const wordCount = writtenChapters.reduce(
    (sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0),
    0,
  );
  const latestChapter = writtenChapters[0] ?? work.chapters[0] ?? null;
  const target = parseTargetWordCount(work.words);
  const completionPercent = target
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
    completionPercent,
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
}

export async function listWorksForUser(params: ListWorksParams) {
  const { query } = params;
  const baseWhere = buildBaseWorkWhere(params);
  const listWhere = buildWorkWhere(params);
  const skip = (query.page - 1) * query.pageSize;
  const summarySort = needsSummarySort(query.sort);

  const [statsRows, total, activeChapter, fallbackWork] = await Promise.all([
    prisma.$queryRaw<Array<{ totalWords: number; chapterCount: number; workCount: number }>>(
      buildStatsSql(params),
    ),
    prisma.work.count({ where: listWhere }),
    prisma.chapter.findFirst({
      where: {
        deletedAt: null,
        wordCount: { gt: 0 },
        work: baseWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        index: true,
        title: true,
        wordCount: true,
        updatedAt: true,
        work: {
          select: workListSelect,
        },
      },
    }),
    prisma.work.findFirst({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      select: workListSelect,
    }),
  ]);

  const totals = statsRows[0] ?? { totalWords: 0, chapterCount: 0, workCount: 0 };
  const activeWork = activeChapter?.work ?? fallbackWork ?? null;
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

  let pagedWorks: WorkListRow[];
  if (summarySort) {
    const pageIds = await prisma.$queryRaw<Array<{ id: string }>>(buildWorkIdPageSql(params, skip));
    const sortIndex = new Map(pageIds.map((row, index) => [row.id, index]));
    pagedWorks = pageIds.length
      ? (
          await prisma.work.findMany({
            where: { id: { in: pageIds.map((row) => row.id) } },
            select: workListSelect,
          })
        ).sort((left, right) => (sortIndex.get(left.id) ?? 0) - (sortIndex.get(right.id) ?? 0))
      : [];
  } else {
    pagedWorks = await prisma.work.findMany({
      where: listWhere,
      orderBy: buildWorkOrderBy(query.sort),
      skip,
      take: query.pageSize,
      select: workListSelect,
    });
  }

  const pagedSummaries = pagedWorks.map(summarizeWork);

  return {
    stats: {
      totalWords: totals.totalWords,
      chapterCount: totals.chapterCount,
      workCount: totals.workCount,
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
      total,
      pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

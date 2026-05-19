import { Prisma } from "@prisma/client";

import { normalizeShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import { prisma } from "@/lib/prisma";
import type { ShortStoryWorkCreateBody } from "@/shared/schemas/short-story-work-api";

export async function createShortStoryWork(params: {
  body: ShortStoryWorkCreateBody;
  userId: string;
}) {
  const { body, userId } = params;
  const outline = normalizeShortStoryOutline(body.outline);
  const outlineJson = outline as Prisma.InputJsonValue;
  const chapterCount = outline.beats.length;

  const work = await prisma.$transaction(async (tx) => {
    return tx.work.create({
      data: {
        userId,
        workType: "short_story",
        genreId: "short_story",
        genreLabel: body.input.genre,
        idea: body.input.idea,
        tags: body.input.tags,
        platformId: null,
        platformLabel: null,
        words: `${outline.targetWords} 字`,
        dnaBookTitle: null,
        tag: outline.tag,
        title: outline.title,
        synopsis: outline.synopsis,
        outline: outlineJson,
        rawOutline: outlineJson,
        targetChapters: chapterCount,
        plannedUntilChapter: chapterCount,
        planningMode: "progressive",
        chapters: {
          create: outline.beats.map((beat) => ({
            index: beat.index,
            title: beat.title,
            content: "",
            wordCount: 0,
            status: "planned",
            chapterOutline: beat.writingPrompt,
            details: [beat.purpose],
          })),
        },
      },
      select: { id: true },
    });
  });

  return { workId: work.id };
}

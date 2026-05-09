import { normalizeStoryOutline } from "@/lib/create/outline-schema";
import { normalizeProgressiveOutline } from "@/lib/create/progressive-planning";
import { getPlanningConfig } from "@/lib/config/planning";
import { prisma } from "@/lib/prisma";
import type { WorkCreateBody } from "@/shared/schemas/work-api";

export async function createWorkFromDraft(params: {
  body: WorkCreateBody;
  userId: string;
}) {
  const { body, userId } = params;
  const story = normalizeStoryOutline(body.story);
  const planningConfig = await getPlanningConfig();
  const progressive = normalizeProgressiveOutline(story, {
    config: planningConfig,
    preset: "smart",
  });

  const work = await prisma.work.create({
    data: {
      userId,
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
      outline: progressive.outline,
      rawOutline: story,
      targetChapters: progressive.targetChapters,
      plannedUntilChapter: progressive.plannedUntilChapter,
      planningMode: "progressive",
    },
    select: { id: true },
  });

  return { workId: work.id };
}

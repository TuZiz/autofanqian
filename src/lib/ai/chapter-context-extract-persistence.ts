import { type ForeshadowingStatus, type MemoryKind } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  mergeCanonStateFromExtractionPayload,
  normalizeNovelCanonState,
} from "@/lib/ai/novel-canon-state";
import type {
  ContextExtractionChapter,
  ContextExtractionCharacter,
} from "./chapter-context-extract-types";
import type { ContextExtractionPayload } from "./chapter-context-extract-parser";

export const CONTEXT_EXTRACT_SOURCE = "context_extract";

export async function applyContextExtractionPayload(params: {
  chapter: ContextExtractionChapter;
  characters: ContextExtractionCharacter[];
  index: number;
  payload: ContextExtractionPayload;
  workId: string;
}) {
  const { chapter, characters, index, payload, workId } = params;

  await prisma.$transaction(async (tx) => {
    const existingDetails = Array.isArray(chapter.details)
      ? chapter.details.filter((item): item is string => typeof item === "string")
      : [];
    const chapterUpdate: {
      summary?: string;
      details?: string[];
    } = {};

    if (!chapter.summary?.trim() && payload.summary) {
      chapterUpdate.summary = payload.summary;
    }

    if (!existingDetails.length && payload.details.length) {
      chapterUpdate.details = payload.details;
    }

    if (chapterUpdate.summary || chapterUpdate.details) {
      await tx.chapter.update({
        where: { id: chapter.id },
        data: chapterUpdate,
      });
    }

    await tx.writingMemory.deleteMany({
      where: { chapterId: chapter.id, source: CONTEXT_EXTRACT_SOURCE },
    });

    if (payload.memories.length) {
      await tx.writingMemory.createMany({
        data: payload.memories.map((item) => ({
          novelId: workId,
          chapterId: chapter.id,
          kind: item.kind as MemoryKind,
          priority: item.priority,
          content: item.content,
          source: CONTEXT_EXTRACT_SOURCE,
          isActive: true,
        })),
      });
    }

    for (const item of payload.timelineEvents) {
      const existing = await tx.timelineEvent.findFirst({
        where: {
          novelId: workId,
          chapterId: chapter.id,
          summary: item.summary,
        },
        select: { id: true },
      });

      if (existing) {
        await tx.timelineEvent.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            summary: item.summary,
            description: item.description,
            storyTime: item.storyTime,
            canonical: item.canonical,
          },
        });
      } else {
        await tx.timelineEvent.create({
          data: {
            novelId: workId,
            chapterId: chapter.id,
            chapterIndex: index,
            title: item.title,
            summary: item.summary,
            description: item.description,
            storyTime: item.storyTime,
            canonical: item.canonical,
          },
        });
      }
    }

    for (const item of payload.foreshadowings) {
      const existing = await tx.foreshadowing.findFirst({
        where: {
          novelId: workId,
          plantedChapter: index,
          hint: item.hint,
          ...(item.title ? { title: item.title } : {}),
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existing) {
        await tx.foreshadowing.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            hint: item.hint,
            payoff: item.payoff,
            importance: item.importance,
            status: item.status as ForeshadowingStatus,
          },
        });
      } else {
        await tx.foreshadowing.create({
          data: {
            novelId: workId,
            plantedChapter: index,
            title: item.title,
            hint: item.hint,
            payoff: item.payoff,
            importance: item.importance,
            status: item.status as ForeshadowingStatus,
          },
        });
      }
    }

    for (const item of payload.characterUpdates) {
      const normalizedName = item.name.trim().toLowerCase();
      const matched = characters.find((character) => {
        if (character.name.trim().toLowerCase() === normalizedName) return true;
        return (character.aliases ?? []).some(
          (alias) => alias.trim().toLowerCase() === normalizedName,
        );
      });

      if (!matched || (!item.currentState && !item.goal && !item.notes)) continue;

      await tx.character.update({
        where: { id: matched.id },
        data: {
          currentState: item.currentState ?? item.notes ?? matched.currentState,
          goal: item.goal ?? matched.goal,
          lastChapter: index,
        },
      });
    }

    const work = await tx.work.findUnique({
      where: { id: workId },
      select: { canonState: true, workType: true },
    });
    if (work) {
      const mode = work.workType === "short_story" ? "short" : "long";
      const current = normalizeNovelCanonState(work.canonState, mode);
      await tx.work.update({
        where: { id: workId },
        data: {
          canonState: mergeCanonStateFromExtractionPayload({
            current,
            mode,
            chapterIndex: index,
            chapterTitle: "title" in chapter && typeof chapter.title === "string" ? chapter.title : null,
            payload,
          }),
        },
      });
    }
  });
}

import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RevisionSource =
  | "manual_save"
  | "ai_generate"
  | "ai_regenerate"
  | "ai_rewrite"
  | "restore_before"
  | "meta_update";

type RevisionClient = typeof prisma | Prisma.TransactionClient;

function hasMeaningfulSnapshot(chapter: {
  title: string | null;
  content: string;
  summary: string | null;
  chapterOutline: string | null;
  details: Prisma.JsonValue | null;
}) {
  if (chapter.title?.trim()) return true;
  if (chapter.content.trim()) return true;
  if (chapter.summary?.trim()) return true;
  if (chapter.chapterOutline?.trim()) return true;
  if (Array.isArray(chapter.details) && chapter.details.length > 0) return true;
  if (chapter.details && !Array.isArray(chapter.details)) return true;
  return false;
}

export async function createChapterRevisionSnapshot(params: {
  client?: RevisionClient;
  workId: string;
  index: number;
  source: RevisionSource | string;
  reason?: string;
  allowEmpty?: boolean;
}) {
  const client = params.client ?? prisma;
  const chapter = await client.chapter.findUnique({
    where: { workId_index: { workId: params.workId, index: params.index } },
    select: {
      id: true,
      title: true,
      content: true,
      summary: true,
      chapterOutline: true,
      details: true,
      wordCount: true,
    },
  });

  if (!chapter) return null;
  if (!params.allowEmpty && !hasMeaningfulSnapshot(chapter)) return null;

  return client.chapterRevision.create({
    data: {
      workId: params.workId,
      chapterId: chapter.id,
      index: params.index,
      title: chapter.title,
      content: chapter.content,
      summary: chapter.summary,
      chapterOutline: chapter.chapterOutline,
      details: chapter.details ?? undefined,
      wordCount: chapter.wordCount,
      source: params.source,
      reason: params.reason ?? params.source,
    },
  });
}

export function serializeRevision<T extends { createdAt: Date }>(revision: T) {
  return {
    ...revision,
    createdAt: revision.createdAt.toISOString(),
  };
}

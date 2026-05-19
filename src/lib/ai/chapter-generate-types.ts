import { z } from "zod";

import type { UpstreamProvider, UpstreamRouteId } from "@/lib/ai/upstream-text";
import type { SessionUser } from "@/lib/auth/user";
import type { StoryOutline } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import type { WorkTypeValue } from "@/shared/work-type";

export const chapterGenerateBodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
});

export type ChapterGenerateInput = {
  workId: string;
  index: number;
  extraPrompt?: string | null;
};

export type PreparedChapterGeneration = {
  user: SessionUser;
  work: {
    id: string;
    userId: string;
    workType: WorkTypeValue;
    genreId: string;
    genreLabel: string | null;
    idea: string;
    tags: string[];
    platformLabel: string | null;
    words: string | null;
    dnaBookTitle: string | null;
    tag: string;
    title: string;
    synopsis: string;
    outline: StoryOutline | ShortStoryOutline;
    targetChapters: number | null;
    plannedUntilChapter: number;
  };
  existingChapter: {
    id: string;
    title: string | null;
    content: string;
    wordCount: number;
  } | null;
  generationMode: "generate" | "regenerate";
  routeId: UpstreamRouteId;
  contextExtractRouteId: UpstreamRouteId;
  providers: UpstreamProvider[];
  preferredProvider: UpstreamProvider;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  promptSnapshot: string;
  maxTokens: number;
  temperature: number;
};

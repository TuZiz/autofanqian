import { z } from "zod";

import type { UpstreamProvider, UpstreamRouteId } from "@/lib/ai/upstream-text";
import type { ChapterPlan } from "@/lib/ai/chapter-plan";
import type { NovelAssembledContext } from "@/lib/ai/novel-context-engine";
import type { NovelMode } from "@/lib/ai/novel-canon-state";
import type { SessionUser } from "@/lib/auth/user";
import type { StoryOutline } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import type { WorkTypeValue } from "@/shared/work-type";

export const chapterGenerateBodySchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  idempotencyKey: z.string().trim().min(8).max(160).optional().nullable(),
  extraPrompt: z.string().trim().max(2000).optional().nullable(),
});

export type ChapterGenerateInput = {
  workId: string;
  index: number;
  idempotencyKey?: string | null;
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
    canonState?: unknown;
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
  promptContext: NovelAssembledContext["context"];
  assembledContext: string;
  generationPlan?: ChapterPlan | null;
  continuityWarnings: string[];
  mode: NovelMode;
  extraPrompt?: string | null;
  contextExtractMaxTokens: number;
  maxTokens: number;
  temperature: number;
};

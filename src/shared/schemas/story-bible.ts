import { z } from "zod";

export const storyBibleSectionSchema = z.enum([
  "characters",
  "worldSettings",
  "timelineEvents",
  "foreshadowings",
  "relationships",
  "writingMemories",
]);

export const storyBibleListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  fromChapter: z.coerce.number().int().min(1).max(9999).optional(),
  toChapter: z.coerce.number().int().min(1).max(9999).optional(),
});

const nullableText = (max: number) => z.string().trim().max(max).optional().nullable();

export const storyBiblePayloadSchema = z.object({
  name: z.string().trim().max(160).optional(),
  title: z.string().trim().max(160).optional().nullable(),
  kind: z.string().trim().max(80).optional(),
  role: z.string().trim().max(80).optional(),
  desc: z.string().trim().max(6000).optional(),
  aliases: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  identity: nullableText(120),
  personality: nullableText(1000),
  goal: nullableText(1000),
  secret: nullableText(1000),
  appearance: nullableText(1000),
  notes: nullableText(2000),
  arc: nullableText(2000),
  currentState: nullableText(1000),
  summary: z.string().trim().max(6000).optional(),
  description: nullableText(6000),
  storyTime: nullableText(160),
  order: z.coerce.number().int().min(0).max(9999).optional(),
  canonical: z.boolean().optional(),
  content: z.string().trim().max(6000).optional(),
  source: nullableText(120),
  priority: z.coerce.number().int().min(0).max(100).optional(),
  firstChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  lastChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  lastUpdatedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  plantedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  resolvedChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  hint: z.string().trim().max(6000).optional(),
  payoff: nullableText(6000),
  status: z.string().trim().max(80).optional(),
  characterAName: z.string().trim().max(80).optional(),
  characterBName: z.string().trim().max(80).optional(),
  conflict: nullableText(2000),
  recentChangeChapter: z.coerce.number().int().min(1).max(9999).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const storyBibleExtractSchema = z.object({
  chapterIndex: z.coerce.number().int().min(1).max(9999),
  force: z.boolean().optional().default(true),
});

export type StoryBibleSection = z.infer<typeof storyBibleSectionSchema>;
export type StoryBiblePayload = z.infer<typeof storyBiblePayloadSchema>;

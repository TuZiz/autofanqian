import { z } from "zod";

import { shortStoryOutlineSchema } from "@/lib/create/short-story-outline-schema";
import { shortStoryInputSchema } from "@/shared/schemas/short-story";

export const SHORT_STORY_GENRES = [
  "悬疑",
  "恋爱",
  "反转",
  "脑洞",
  "虐文",
  "爽文",
  "短剧风",
  "小红书故事",
] as const;

export const shortStoryGenerateSchema = shortStoryInputSchema;

export const shortStoryGeneratedSchema = z.object({
  title: z.string().trim().min(1).max(80),
  synopsis: z.string().trim().min(20).max(2000),
  outline: z.union([
    z.string().trim().min(30).max(6000),
    shortStoryOutlineSchema,
  ]),
  content: z.string().trim().min(200).max(120_000),
});

export type ShortStoryGenerateInput = z.infer<typeof shortStoryGenerateSchema>;
export type ShortStoryGenerated = z.infer<typeof shortStoryGeneratedSchema>;

import { z } from "zod";

import {
  SHORT_STORY_STYLE_OPTIONS,
  SHORT_STORY_WORD_OPTIONS,
} from "@/shared/schemas/short-story";

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

export const shortStoryGenerateSchema = z.object({
  genre: z.enum(SHORT_STORY_GENRES, {
    message: "请选择短篇类型。",
  }),
  style: z.enum(SHORT_STORY_STYLE_OPTIONS, {
    message: "请选择风格。",
  }),
  targetWords: z.coerce
    .number()
    .int("目标字数必须是整数。")
    .refine((value) => SHORT_STORY_WORD_OPTIONS.includes(value as (typeof SHORT_STORY_WORD_OPTIONS)[number]), {
      message: "请选择有效目标字数。",
    }),
  idea: z
    .string()
    .trim()
    .min(10, "创意输入至少 10 个字。")
    .max(2000, "创意输入不能超过 2000 个字。"),
});

export const shortStoryGeneratedSchema = z.object({
  title: z.string().trim().min(1).max(80),
  synopsis: z.string().trim().min(20).max(2000),
  outline: z.string().trim().min(30).max(6000),
  content: z.string().trim().min(200).max(120_000),
});

export type ShortStoryGenerateInput = z.infer<typeof shortStoryGenerateSchema>;
export type ShortStoryGenerated = z.infer<typeof shortStoryGeneratedSchema>;

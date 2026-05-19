import { z } from "zod";

export const SHORT_STORY_WORD_OPTIONS = [3000, 5000, 8000, 10000, 20000] as const;

export const SHORT_STORY_STYLE_OPTIONS = [
  "反转",
  "治愈",
  "黑暗",
  "轻松",
  "文艺",
  "爽感",
  "短剧化",
] as const;

export const SHORT_STORY_POV_OPTIONS = ["第一人称", "第三人称", "多视角"] as const;

export const SHORT_STORY_ENDING_TYPES = [
  "open",
  "twist",
  "happy",
  "tragic",
  "blank",
] as const;

export const SHORT_STORY_ENDING_LABELS: Record<
  (typeof SHORT_STORY_ENDING_TYPES)[number],
  string
> = {
  open: "开放式",
  twist: "反转式",
  happy: "圆满式",
  tragic: "悲剧式",
  blank: "留白式",
};

export const shortStoryInputSchema = z.object({
  genre: z.string().trim().min(1, "请选择或填写短篇类型。").max(64),
  tags: z
    .array(z.string().trim().min(1).max(24))
    .max(12, "标签最多 12 个。")
    .default([]),
  targetWords: z.coerce
    .number()
    .int("目标字数必须是整数。")
    .min(1000, "目标字数不能少于 1000。")
    .max(50000, "目标字数不能超过 50000。"),
  style: z.enum(SHORT_STORY_STYLE_OPTIONS, {
    message: "请选择叙事风格。",
  }),
  pov: z.enum(SHORT_STORY_POV_OPTIONS, {
    message: "请选择叙事视角。",
  }),
  endingType: z.enum(SHORT_STORY_ENDING_TYPES, {
    message: "请选择结局倾向。",
  }),
  idea: z
    .string()
    .trim()
    .min(10, "核心创意至少 10 个字。")
    .max(2000, "核心创意不能超过 2000 个字。"),
});

export type ShortStoryInput = z.infer<typeof shortStoryInputSchema>;
export type ShortStoryEndingType = (typeof SHORT_STORY_ENDING_TYPES)[number];

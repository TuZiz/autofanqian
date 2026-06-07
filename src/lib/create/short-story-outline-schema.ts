import { z } from "zod";

import {
  SHORT_STORY_ENDING_TYPES,
  type ShortStoryEndingType,
} from "@/shared/schemas/short-story";

const boundedText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const shortStoryCharacterSchema = z
  .object({
    name: boundedText(1, 40),
    role: boundedText(1, 40),
    description: boundedText(10, 500),
  })
  .strict();

export const shortStoryBeatSchema = z
  .object({
    index: z.coerce.number().int().min(1).max(12),
    title: boundedText(1, 80),
    purpose: boundedText(10, 500),
    targetWords: z.coerce.number().int().min(100).max(50000),
    writingPrompt: boundedText(20, 1200),
  })
  .strict();

export const shortStoryOutlineSchema = z
  .object({
    tag: boundedText(1, 12),
    title: boundedText(1, 80),
    synopsis: boundedText(30, 2000),
    targetWords: z.coerce.number().int().min(800).max(50000),
    theme: boundedText(2, 200),
    hook: boundedText(10, 500),
    endingType: z.enum(SHORT_STORY_ENDING_TYPES),
    characters: z.array(shortStoryCharacterSchema).min(1).max(5),
    beats: z.array(shortStoryBeatSchema).min(3).max(12),
    fullOutline: z.string().trim().max(12_000).optional(),
  })
  .strict()
  .superRefine((outline, ctx) => {
    const indexes = outline.beats.map((beat) => beat.index);
    const uniqueIndexes = new Set(indexes);
    if (uniqueIndexes.size !== indexes.length) {
      ctx.addIssue({
        code: "custom",
        path: ["beats"],
        message: "短篇段落序号不能重复。",
      });
    }
  });

export type ShortStoryCharacter = z.infer<typeof shortStoryCharacterSchema>;
export type ShortStoryBeat = z.infer<typeof shortStoryBeatSchema>;
export type ShortStoryOutlineInput = z.infer<typeof shortStoryOutlineSchema>;
export type ShortStoryOutline = Omit<
  ShortStoryOutlineInput,
  "fullOutline"
> & {
  fullOutline: string;
};
export type { ShortStoryEndingType };

export function normalizeShortStoryOutline(
  outline: ShortStoryOutlineInput,
): ShortStoryOutline {
  const beats = outline.beats
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((beat, index) => ({
      ...beat,
      index: index + 1,
    }));

  return {
    ...outline,
    tag: outline.tag.trim(),
    title: outline.title.trim(),
    synopsis: outline.synopsis.trim(),
    theme: outline.theme.trim(),
    hook: outline.hook.trim(),
    endingType: outline.endingType,
    characters: outline.characters.map((character) => ({
      name: character.name.trim(),
      role: character.role.trim(),
      description: character.description.trim(),
    })),
    beats,
    fullOutline: normalizeFullOutline(outline, beats),
  };
}

function normalizeFullOutline(
  outline: ShortStoryOutlineInput,
  beats: ShortStoryBeat[],
) {
  const explicit = outline.fullOutline?.trim();
  if (explicit && explicit.length >= 20) return explicit;

  return [
    `标题：${outline.title.trim()}`,
    `简介：${outline.synopsis.trim()}`,
    `主题：${outline.theme.trim()}`,
    `开篇钩子：${outline.hook.trim()}`,
    `结局倾向：${outline.endingType}`,
    "角色：",
    ...outline.characters.map(
      (character) =>
        `- ${character.name.trim()}（${character.role.trim()}）：${character.description.trim()}`,
    ),
    "结构节点：",
    ...beats.map(
      (beat) =>
        `${beat.index}. ${beat.title}：${beat.purpose}。写作提示：${beat.writingPrompt}`,
    ),
  ].join("\n");
}

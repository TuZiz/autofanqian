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
    targetWords: z.coerce.number().int().min(1000).max(50000),
    theme: boundedText(2, 200),
    hook: boundedText(10, 500),
    endingType: z.enum(SHORT_STORY_ENDING_TYPES),
    characters: z.array(shortStoryCharacterSchema).min(1).max(5),
    beats: z.array(shortStoryBeatSchema).min(3).max(12),
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
export type ShortStoryOutline = z.infer<typeof shortStoryOutlineSchema>;
export type { ShortStoryEndingType };

export function normalizeShortStoryOutline(
  outline: z.infer<typeof shortStoryOutlineSchema>,
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
  };
}

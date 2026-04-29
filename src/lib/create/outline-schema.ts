import { z } from "zod";

import type { StoryOutline } from "@/lib/create/outline-draft";

const chapterNumberSchema = z.coerce.number().int().min(1).max(9999);

export const storyOutlineSegmentSchema = z
  .object({
    title: z.string().min(1).max(48),
    startChapter: chapterNumberSchema,
    endChapter: chapterNumberSchema,
    desc: z.string().min(8).max(420),
  })
  .superRefine((segment, ctx) => {
    if (segment.endChapter < segment.startChapter) {
      ctx.addIssue({
        code: "custom",
        path: ["endChapter"],
        message: "小节结束章节不能小于开始章节。",
      });
    }
  });

export const storyOutlineVolumeSchema = z
  .object({
    name: z.string().min(1).max(40),
    desc: z.string().min(20).max(2200),
    startChapter: chapterNumberSchema.optional(),
    endChapter: chapterNumberSchema.optional(),
    segments: z.array(storyOutlineSegmentSchema).min(1).max(30).optional(),
  })
  .superRefine((volume, ctx) => {
    const hasStart = typeof volume.startChapter === "number";
    const hasEnd = typeof volume.endChapter === "number";

    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: "custom",
        path: ["startChapter"],
        message: "卷起止章节必须同时存在。",
      });
    }

    if (hasStart && hasEnd && volume.endChapter! < volume.startChapter!) {
      ctx.addIssue({
        code: "custom",
        path: ["endChapter"],
        message: "卷结束章节不能小于开始章节。",
      });
    }

    if (hasStart && hasEnd && volume.segments?.length) {
      for (const [index, segment] of volume.segments.entries()) {
        if (
          segment.startChapter < volume.startChapter! ||
          segment.endChapter > volume.endChapter!
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["segments", index],
            message: "小节章节范围必须落在所属卷范围内。",
          });
        }
      }
    }
  });

export const storyOutlineSchema = z.object({
  tag: z.string().min(1).max(12),
  title: z.string().min(1).max(80),
  synopsis: z.string().min(60).max(2400),
  totalChapters: chapterNumberSchema.optional(),
  volumes: z.array(storyOutlineVolumeSchema).min(2).max(10),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(20),
        role: z.enum(["protagonist", "heroine", "antagonist", "supporting"]),
        desc: z.string().min(20).max(320),
      }),
    )
    .min(3)
    .max(8),
});

function orderSegments(
  segments: StoryOutline["volumes"][number]["segments"],
) {
  return (segments ?? [])
    .slice()
    .sort(
      (left, right) =>
        left.startChapter - right.startChapter || left.endChapter - right.endChapter,
    );
}

export function normalizeStoryOutline(
  outline: z.infer<typeof storyOutlineSchema>,
): StoryOutline {
  const volumes = outline.volumes.map((volume) => {
    const segments = orderSegments(volume.segments);
    const startChapter = volume.startChapter ?? segments[0]?.startChapter;
    const endChapter =
      volume.endChapter ?? segments[segments.length - 1]?.endChapter;

    return {
      ...volume,
      ...(typeof startChapter === "number" ? { startChapter } : {}),
      ...(typeof endChapter === "number" ? { endChapter } : {}),
      ...(segments.length ? { segments } : {}),
    };
  });

  const inferredTotal = Math.max(
    0,
    ...volumes
      .map((volume) => volume.endChapter)
      .filter((value): value is number => typeof value === "number"),
  );

  return {
    ...outline,
    totalChapters: outline.totalChapters ?? (inferredTotal > 0 ? inferredTotal : undefined),
    volumes,
  };
}

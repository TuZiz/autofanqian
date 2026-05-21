import { z } from "zod";

import { WORK_TYPES } from "@/shared/work-type";

export const IMPORT_RAW_TEXT_MAX_LENGTH = 2 * 1024 * 1024;
export const IMPORT_MAX_CHAPTERS = 1000;
export const IMPORT_CHAPTER_CONTENT_MAX_LENGTH = 200_000;

const importMetadataSchema = z.object({
  workType: z.enum(WORK_TYPES),
  title: z.string().trim().min(1, "请填写作品标题。").max(120),
  genre: z.string().trim().min(1, "请填写题材。").max(64),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  platform: z.string().trim().max(64).default(""),
  synopsis: z.string().trim().max(2000).optional().nullable(),
});

export const workImportPreviewSchema = importMetadataSchema.extend({
  rawText: z
    .string()
    .min(1, "请粘贴或上传作品正文。")
    .max(IMPORT_RAW_TEXT_MAX_LENGTH, "导入文本不能超过 2MB。"),
});

export const workImportChapterSchema = z.object({
  index: z.coerce.number().int().min(1).max(9999),
  title: z.string().trim().min(1).max(120),
  content: z
    .string()
    .trim()
    .min(1, "章节正文不能为空。")
    .max(IMPORT_CHAPTER_CONTENT_MAX_LENGTH, "单章正文不能超过 200000 字符。"),
});

export const workImportConfirmSchema = importMetadataSchema
  .extend({
    chapters: z
      .array(workImportChapterSchema)
      .min(1, "至少需要导入 1 章。")
      .max(IMPORT_MAX_CHAPTERS, "单次最多导入 1000 章。"),
  })
  .superRefine((body, ctx) => {
    const indexes = body.chapters.map((chapter) => chapter.index);
    if (new Set(indexes).size !== indexes.length) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: "章节序号不能重复。",
      });
    }
  });

export type WorkImportPreviewInput = z.infer<typeof workImportPreviewSchema>;
export type WorkImportConfirmInput = z.infer<typeof workImportConfirmSchema>;

import { z } from "zod";

export const WORK_EXPORT_FORMATS = ["txt", "markdown", "md", "docx", "epub"] as const;
export const WORK_EXPORT_AVAILABLE_FORMATS = ["txt", "md", "docx"] as const;

export const workExportFormatSchema = z.enum(WORK_EXPORT_FORMATS);
export const workExportScopeSchema = z.enum(["book", "chapter", "short_story"]);

export const workExportQuerySchema = z.object({
  format: workExportFormatSchema.default("txt"),
  scope: workExportScopeSchema.default("book"),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
});

export const workExportPreviewQuerySchema = z.object({
  scope: workExportScopeSchema.default("book"),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
});

export type WorkExportFormat = z.infer<typeof workExportFormatSchema>;
export type WorkExportScope = z.infer<typeof workExportScopeSchema>;
export type WorkExportPreview = {
  chapterCount: number;
  totalWordCount: number;
  emptyChapters: number[];
  missingIndexes: number[];
  warnings: string[];
  availableFormats: Array<(typeof WORK_EXPORT_AVAILABLE_FORMATS)[number]>;
};

import { z } from "zod";

export const chapterConsistencyRequestSchema = z.object({
  workId: z.string().min(1).max(64),
  chapterIndex: z.coerce.number().int().min(1).max(9999),
});

export const chapterConsistencyIssueSeveritySchema = z.enum(["low", "medium", "high"]);
export const chapterConsistencyIssueTypeSchema = z.enum([
  "character",
  "timeline",
  "setting",
  "plot",
  "style",
  "other",
]);

export const chapterConsistencyIssueSchema = z.object({
  severity: chapterConsistencyIssueSeveritySchema,
  type: chapterConsistencyIssueTypeSchema,
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(800),
  suggestion: z.string().trim().min(1).max(800),
});

export const chapterConsistencyResultSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  issues: z.array(chapterConsistencyIssueSchema).max(20).default([]),
});

export type ChapterConsistencyRequest = z.infer<
  typeof chapterConsistencyRequestSchema
>;
export type ChapterConsistencyIssue = z.infer<typeof chapterConsistencyIssueSchema>;
export type ChapterConsistencyResult = z.infer<typeof chapterConsistencyResultSchema>;

import { z } from "zod";

export const chapterConsistencyRequestSchema = z.object({
  workId: z.string().min(1).max(64),
  chapterIndex: z.coerce.number().int().min(1).max(9999).optional(),
  scope: z.enum(["current", "recent5", "book"]).optional().default("current"),
}).superRefine((body, ctx) => {
  if (body.scope !== "book" && !body.chapterIndex) {
    ctx.addIssue({
      code: "custom",
      path: ["chapterIndex"],
      message: "检查当前章或最近 5 章时必须提供章节序号。",
    });
  }
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
  severeProblems: z.array(z.string().trim().min(1).max(600)).max(20).default([]),
  mediumProblems: z.array(z.string().trim().min(1).max(600)).max(20).default([]),
  suggestions: z.array(z.string().trim().min(1).max(800)).max(30).default([]),
  autoFixPrompt: z.string().trim().max(4000).default(""),
  scope: z.enum(["current", "recent5", "book"]).optional(),
  jobId: z.string().optional(),
  status: z.string().optional(),
});

export type ChapterConsistencyRequest = z.infer<
  typeof chapterConsistencyRequestSchema
>;
export type ChapterConsistencyIssue = z.infer<typeof chapterConsistencyIssueSchema>;
export type ChapterConsistencyResult = z.infer<typeof chapterConsistencyResultSchema>;

import { z } from "zod";

export const generationJobIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

export const generationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "success",
  "failed",
  "cancelled",
  "stale",
]);

export const USER_RETRYABLE_JOB_TYPES = [
  "short_story.generate.long",
  "chapter.batch_generate",
  "bible.extract",
  "chapter.consistency.book",
] as const;

export const userRetryableJobTypeSchema = z.enum(USER_RETRYABLE_JOB_TYPES);

export type UserRetryableJobType = z.infer<typeof userRetryableJobTypeSchema>;
export type SerializedGenerationJobStatus = z.infer<typeof generationJobStatusSchema>;

export type SerializedGenerationJobProgress = {
  generatedSegments: number;
  totalSegments: number | null;
  finalWorkId: string | null;
};

export type SerializedGenerationJob = {
  id: string;
  workId: string;
  action: string;
  jobType: string | null;
  status: SerializedGenerationJobStatus;
  resultSummary: string | null;
  errorMessage: string | null;
  resultJson: unknown;
  progress: SerializedGenerationJobProgress | null;
  chapterIndex: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
  completedAt: string | null;
  work: {
    id: string;
    title: string;
    workType: string;
  } | null;
};

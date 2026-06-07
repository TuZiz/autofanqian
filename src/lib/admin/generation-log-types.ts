import type { SerializedGenerationJobProgress } from "@/shared/schemas/generation-job";

export const generationLogStatuses = [
  "queued",
  "running",
  "succeeded",
  "success",
  "failed",
  "cancelled",
  "stale",
] as const;

export const generationLogStatusFilters = ["all", ...generationLogStatuses] as const;

export type GenerationLogStatus = (typeof generationLogStatuses)[number];
export type GenerationLogStatusFilter = (typeof generationLogStatusFilters)[number];

export type GenerationLogListItem = {
  id: string;
  action: string;
  jobType: string | null;
  status: GenerationLogStatus;
  resultSummary: string | null;
  errorMessage: string | null;
  error: string | null;
  chapterIndex: number | null;
  routeId: string | null;
  providerId: string | null;
  modelUsed: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
  completedAt: string | null;
  progress: SerializedGenerationJobProgress | null;
  failureCount: number;
  novel: {
    id: string;
    title: string;
    workType: string;
  } | null;
  user: {
    id: string;
    email: string;
  } | null;
};

export type GenerationLogDetail = GenerationLogListItem & {
  chapter: {
    id: string;
    index: number;
    title: string | null;
  } | null;
  promptSnapshot: string | null;
  promptTemplateKey: string | null;
  promptTemplateVersion: number | null;
  resultJson: unknown;
  user: {
    id: string;
    email: string;
    role: string;
    membershipTier: string;
  } | null;
};

export type GenerationLogsResponse = {
  counts: Array<{
    count: number;
    status: string;
  }>;
  jobs: GenerationLogListItem[];
  nextCursor: string | null;
  summary: {
    latestWindowSize: number;
    successRate: number;
    successCount: number;
    failedCount: number;
    runningCount: number;
    queuedCount: number;
    staleCount: number;
    cancelledCount: number;
    latestFailedMessage: string | null;
    bars: Array<{
      id: string;
      status: string;
      createdAt: string;
    }>;
  };
  today: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    avgDurationMs: number | null;
    totalTokens: number;
  };
};

export type GenerationLogDetailResponse = {
  job: GenerationLogDetail;
};

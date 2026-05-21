import "server-only";

import type { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";
import type {
  SerializedGenerationJob,
  SerializedGenerationJobProgress,
} from "@/shared/schemas/generation-job";

const generationJobViewSelect = {
  id: true,
  userId: true,
  novelId: true,
  workId: true,
  action: true,
  jobType: true,
  status: true,
  resultSummary: true,
  errorMessage: true,
  resultJson: true,
  chapterIndex: true,
  inputTokens: true,
  outputTokens: true,
  totalTokens: true,
  durationMs: true,
  createdAt: true,
  startedAt: true,
  heartbeatAt: true,
  finishedAt: true,
  completedAt: true,
  novel: {
    select: {
      id: true,
      userId: true,
      title: true,
      workType: true,
    },
  },
} satisfies Prisma.GenerationJobSelect;

type GenerationJobViewRow = Prisma.GenerationJobGetPayload<{
  select: typeof generationJobViewSelect;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getJobProgress(resultJson: unknown): SerializedGenerationJobProgress | null {
  const json = asRecord(resultJson);
  if (!json) return null;
  const segments = Array.isArray(json.segments) ? json.segments : [];
  const outline = asRecord(json.outline);
  const beats = Array.isArray(outline?.beats) ? outline.beats : null;
  const finalWorkId = typeof json.finalWorkId === "string" ? json.finalWorkId : null;

  if (!segments.length && !beats?.length && !finalWorkId) return null;
  return {
    generatedSegments: segments.length,
    totalSegments: beats?.length ?? null,
    finalWorkId,
  };
}

export function serializeGenerationJob(row: GenerationJobViewRow): SerializedGenerationJob {
  return {
    id: row.id,
    workId: row.novelId,
    action: row.action,
    jobType: row.jobType,
    status: row.status,
    resultSummary: row.resultSummary,
    errorMessage: row.errorMessage,
    resultJson: row.resultJson,
    progress: getJobProgress(row.resultJson),
    chapterIndex: row.chapterIndex,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    work: row.novel
      ? {
          id: row.novel.id,
          title: row.novel.title,
          workType: row.novel.workType,
        }
      : null,
  };
}

export async function requireGenerationJobAccess(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
  }

  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: generationJobViewSelect,
  });

  if (!job) {
    throw new AuthApiError(404, "任务不存在或已被清理。");
  }

  const isAdmin = isAdminUser(user);
  const ownsJob = job.userId === user.id || job.novel?.userId === user.id;
  if (!isAdmin && !ownsJob) {
    throw new AuthApiError(403, "无权限查看该任务。");
  }

  return { user, isAdmin, job };
}

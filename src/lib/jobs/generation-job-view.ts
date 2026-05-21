import "server-only";

import type { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { parseGenerationJobProgress } from "@/lib/jobs/generation-job-progress";
import { prisma } from "@/lib/prisma";
import type { SerializedGenerationJob } from "@/shared/schemas/generation-job";

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
    progress: parseGenerationJobProgress(row.resultJson),
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

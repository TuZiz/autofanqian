import { after } from "next/server";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import {
  requireGenerationJobAccess,
  serializeGenerationJob,
} from "@/lib/jobs/generation-job-view";
import { runGenerationJob } from "@/lib/jobs/generation-job-runner";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/security/origin";
import {
  generationJobIdParamsSchema,
  type UserRetryableJobType,
  USER_RETRYABLE_JOB_TYPES,
} from "@/shared/schemas/generation-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const retryableStatuses = ["failed", "stale", "queued"] as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    assertSameOriginRequest(request);
    const rawParams = await context.params;
    const params = generationJobIdParamsSchema.parse({ id: rawParams.id ?? "" });
    const { job } = await requireGenerationJobAccess(params.id);

    if (!job.jobType || !USER_RETRYABLE_JOB_TYPES.includes(job.jobType as UserRetryableJobType)) {
      throw new AuthApiError(400, "该任务类型不支持用户重试。");
    }
    if (!retryableStatuses.includes(job.status as (typeof retryableStatuses)[number])) {
      throw new AuthApiError(409, "当前任务状态不能重试。");
    }

    const queued = await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "queued",
        error: null,
        errorMessage: null,
        resultSummary: job.status === "queued" ? job.resultSummary : "任务已重新排队，正在等待执行。",
        heartbeatAt: new Date(),
        finishedAt: null,
        completedAt: null,
      },
      select: {
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
        novel: { select: { id: true, userId: true, title: true, workType: true } },
      },
    });

    after(async () => {
      try {
        await runGenerationJob(job.id, { retryFailed: true });
      } catch (error) {
        console.warn("user retry generation job failed to start", error);
      }
    });

    return successResponse(serializeGenerationJob(queued), {
      message: "任务已重新排队，系统会尝试继续执行。",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

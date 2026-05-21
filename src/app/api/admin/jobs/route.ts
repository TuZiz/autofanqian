import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import {
  getGenerationJobFailureCount,
  parseGenerationJobProgress,
} from "@/lib/jobs/generation-job-progress";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  status: z
    .enum(["all", "queued", "running", "succeeded", "success", "failed", "cancelled", "stale"])
    .optional()
    .default("all"),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  executableOnly: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .optional()
    .default(false),
});

const executableStatuses = ["queued", "stale", "failed"] as const;

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const selectedStatuses =
      query.status === "all"
        ? query.executableOnly
          ? [...executableStatuses]
          : []
        : [query.status];
    const noMatchingStatus =
      query.executableOnly &&
      query.status !== "all" &&
      !executableStatuses.includes(query.status as (typeof executableStatuses)[number]);
    const statusWhere = noMatchingStatus
      ? { id: "__no_matching_status__" }
      : selectedStatuses.length
        ? { status: { in: selectedStatuses } }
        : {};
    const [jobs, counts] = await Promise.all([
      prisma.generationJob.findMany({
        where: statusWhere,
        orderBy: [{ createdAt: "desc" }],
        take: query.take,
        select: {
          id: true,
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
          novel: { select: { id: true, title: true, workType: true } },
          user: { select: { email: true } },
        },
      }),
      prisma.generationJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return successResponse(
      {
        jobs: jobs.map((job) => ({
          ...job,
          resultJson: undefined,
          progress: parseGenerationJobProgress(job.resultJson),
          failureCount: getGenerationJobFailureCount(job.resultJson),
          createdAt: job.createdAt.toISOString(),
          startedAt: job.startedAt?.toISOString() ?? null,
          heartbeatAt: job.heartbeatAt?.toISOString() ?? null,
          finishedAt: job.finishedAt?.toISOString() ?? null,
          completedAt: job.completedAt?.toISOString() ?? null,
        })),
        counts: counts.map((item) => ({ status: item.status, count: item._count._all })),
      },
      { message: "OK" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

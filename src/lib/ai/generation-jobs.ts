import "server-only";

import { Prisma, type GenerationJob } from "@prisma/client";

import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";

const GENERATION_JOB_STALE_MS = 30 * 60 * 1000;
const ACTIVE_GENERATION_STATUSES = ["queued", "running"] as const;
const CHAPTER_GENERATION_ACTIONS = [
  "chapter.generate",
  "chapter.generate.stream",
  "regenerate.all",
  "regenerate.all.stream",
];
const ACTIVE_LOCK_CHAPTER_PLACEHOLDER = "none";

export type BeginGenerationJobParams = {
  userId: string;
  workId: string;
  chapterId?: string | null;
  chapterIndex?: number | null;
  action: string;
  jobType?: string | null;
  idempotencyKey?: string | null;
  routeId?: string | null;
  providerId?: string | null;
  modelUsed?: string | null;
  promptTemplateKey?: string | null;
  promptSnapshot?: string | null;
};

export type BeginGenerationJobResult =
  | {
      kind: "started";
      job: GenerationJob;
    }
  | {
      kind: "completed";
      job: GenerationJob;
    };

export async function markStaleGenerationJobs(now = new Date()) {
  const staleBefore = new Date(now.getTime() - GENERATION_JOB_STALE_MS);
  await prisma.generationJob.updateMany({
    where: {
      status: "running",
      heartbeatAt: { lt: staleBefore },
    },
    data: {
      status: "stale",
      error: "generation_job_stale",
      errorMessage: "生成任务超过 30 分钟未更新心跳，已自动标记为过期。",
      finishedAt: now,
      completedAt: now,
      activeLockKey: null,
    },
  });
  await prisma.generationJob.updateMany({
    where: {
      status: "queued",
      createdAt: { lt: staleBefore },
    },
    data: {
      status: "stale",
      error: "generation_job_stale",
      errorMessage: "生成任务排队超过 30 分钟未执行，已自动标记为过期。",
      finishedAt: now,
      completedAt: now,
      activeLockKey: null,
    },
  });
}

export function normalizeGenerationJobSuccessStatus(status: string) {
  return status === "success" ? "succeeded" : status;
}

function getActiveGenerationLockKey(params: {
  userId: string;
  workId: string;
  chapterId?: string | null;
  chapterIndex?: number | null;
}) {
  return [
    params.userId,
    params.workId,
    params.chapterIndex ?? ACTIVE_LOCK_CHAPTER_PLACEHOLDER,
    params.chapterId ?? ACTIVE_LOCK_CHAPTER_PLACEHOLDER,
  ].join(":");
}

export async function beginGenerationJob(
  params: BeginGenerationJobParams,
): Promise<BeginGenerationJobResult> {
  const now = new Date();
  await markStaleGenerationJobs(now);
  const activeLockKey = CHAPTER_GENERATION_ACTIONS.includes(params.action)
    ? getActiveGenerationLockKey(params)
    : null;

  if (params.idempotencyKey) {
    const existing = await prisma.generationJob.findUnique({
      where: {
        userId_action_idempotencyKey: {
          userId: params.userId,
          action: params.action,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (
        existing.status === "succeeded" ||
        normalizeGenerationJobSuccessStatus(existing.status) === "succeeded"
      ) {
        return { kind: "completed", job: existing };
      }

      const message = ACTIVE_GENERATION_STATUSES.includes(
        existing.status as (typeof ACTIVE_GENERATION_STATUSES)[number],
      )
        ? "该章节正在生成中，请等待生成结束后再操作。"
        : "该生成请求已经处理过，请刷新章节查看最新结果。";
      throw new AuthApiError(409, message);
    }
  }

  const active = await prisma.generationJob.findFirst({
    where: {
      userId: params.userId,
      novelId: params.workId,
      chapterIndex: params.chapterIndex ?? null,
      action: { in: CHAPTER_GENERATION_ACTIONS },
      status: { in: [...ACTIVE_GENERATION_STATUSES] },
    },
    select: { id: true, status: true },
  });

  if (active) {
    throw new AuthApiError(409, "该章节正在生成中，请等待生成结束后再操作。");
  }

  try {
    const job = await prisma.generationJob.create({
      data: {
        userId: params.userId,
        novelId: params.workId,
        workId: params.workId,
        chapterId: params.chapterId ?? null,
        chapterIndex: params.chapterIndex ?? null,
        action: params.action,
        jobType: params.jobType ?? params.action,
        status: "running",
        activeLockKey,
        idempotencyKey: params.idempotencyKey ?? null,
        routeId: params.routeId ?? null,
        providerId: params.providerId ?? null,
        modelUsed: params.modelUsed ?? null,
        promptTemplateKey: params.promptTemplateKey ?? null,
        promptSnapshot: params.promptSnapshot ? params.promptSnapshot.slice(0, 20000) : null,
        startedAt: now,
        heartbeatAt: now,
      },
    });
    return { kind: "started", job };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthApiError(409, "该章节正在生成中，请等待生成结束后再操作。");
    }
    throw error;
  }
}

export async function touchGenerationJob(jobId: string) {
  await prisma.generationJob
    .update({
      where: { id: jobId },
      data: { heartbeatAt: new Date() },
      select: { id: true },
    })
    .catch(() => undefined);
}

export async function completeGenerationJob(
  jobId: string,
  data: Prisma.GenerationJobUncheckedUpdateInput,
) {
  const now = new Date();
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      ...data,
      status: "succeeded",
      activeLockKey: null,
      finishedAt: now,
      completedAt: now,
      heartbeatAt: now,
    },
  });
}

export async function failGenerationJob(
  jobId: string,
  error: string,
  data: Prisma.GenerationJobUncheckedUpdateInput = {},
) {
  const now = new Date();
  await prisma.generationJob
    .update({
      where: { id: jobId },
      data: {
        ...data,
        status: "failed",
        activeLockKey: null,
        error,
        errorMessage: error,
        finishedAt: now,
        completedAt: now,
        heartbeatAt: now,
      },
    })
    .catch(() => undefined);
}

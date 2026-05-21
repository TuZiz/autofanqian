import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { UpstreamTextResult } from "@/lib/ai/upstream-text";
import { AI_ACTIONS } from "@/shared/ai-actions";

export type AiStepAction =
  | "chapter.plan"
  | typeof AI_ACTIONS.chapterConsistency
  | "chapter.consistency_check"
  | "chapter.consistency_repair"
  | "chapter.quality_check"
  | "canon.compress";

export async function beginAiStepJob(params: {
  userId?: string | null;
  workId: string;
  chapterId?: string | null;
  chapterIndex?: number | null;
  action: AiStepAction;
  routeId?: string | null;
  providerId?: string | null;
  modelUsed?: string | null;
  promptSnapshot?: string | null;
}) {
  return prisma.generationJob
    .create({
      data: {
        userId: params.userId ?? null,
        novelId: params.workId,
        workId: params.workId,
        chapterId: params.chapterId ?? null,
        chapterIndex: params.chapterIndex ?? null,
        action: params.action,
        jobType: params.action,
        status: "running",
        routeId: params.routeId ?? null,
        providerId: params.providerId ?? null,
        modelUsed: params.modelUsed ?? null,
        promptTemplateKey: params.action,
        promptSnapshot: params.promptSnapshot?.slice(0, 20000) ?? null,
        startedAt: new Date(),
        heartbeatAt: new Date(),
      },
      select: { id: true },
    })
    .catch(() => null);
}

export async function completeAiStepJob(params: {
  jobId?: string | null;
  result?: UpstreamTextResult | null;
  resultSummary: string;
  resultJson?: Prisma.InputJsonValue;
  providerId?: string | null;
  modelUsed?: string | null;
}) {
  if (!params.jobId) return;
  const now = new Date();
  await prisma.generationJob
    .update({
      where: { id: params.jobId },
      data: {
        status: "succeeded",
        providerId: params.result?.providerId ?? params.providerId ?? null,
        modelUsed: params.result?.modelUsed ?? params.modelUsed ?? null,
        inputTokens: params.result?.usage?.inputTokens ?? null,
        outputTokens: params.result?.usage?.outputTokens ?? null,
        totalTokens: params.result?.usage?.totalTokens ?? null,
        durationMs: params.result?.durationMs ?? null,
        resultSummary: params.resultSummary,
        resultJson: params.resultJson ?? undefined,
        finishedAt: now,
        completedAt: now,
        heartbeatAt: now,
      },
    })
    .catch(() => undefined);
}

export async function failAiStepJob(params: {
  jobId?: string | null;
  result?: UpstreamTextResult | null;
  error: string;
  resultSummary?: string;
  resultJson?: Prisma.InputJsonValue;
  providerId?: string | null;
  modelUsed?: string | null;
}) {
  if (!params.jobId) return;
  const now = new Date();
  await prisma.generationJob
    .update({
      where: { id: params.jobId },
      data: {
        status: "failed",
        providerId: params.result?.providerId ?? params.providerId ?? null,
        modelUsed: params.result?.modelUsed ?? params.modelUsed ?? null,
        inputTokens: params.result?.usage?.inputTokens ?? null,
        outputTokens: params.result?.usage?.outputTokens ?? null,
        totalTokens: params.result?.usage?.totalTokens ?? null,
        durationMs: params.result?.durationMs ?? null,
        error: params.error,
        errorMessage: params.error,
        resultSummary: params.resultSummary ?? params.error,
        resultJson: params.resultJson ?? undefined,
        finishedAt: now,
        completedAt: now,
        heartbeatAt: now,
      },
    })
    .catch(() => undefined);
}

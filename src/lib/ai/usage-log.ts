import "server-only";

import type { UpstreamTextResult } from "@/lib/ai/upstream-text";
import { prisma } from "@/lib/prisma";

export type AiUsageLogParams = {
  userId?: string | null;
  action: string;
  result: UpstreamTextResult;
};

export function buildAiUsageEventData(params: AiUsageLogParams) {
  const { result } = params;

  return {
    userId: params.userId ?? null,
    action: params.action,
    routeId: result.routeId ?? null,
    providerId: result.providerId ?? null,
    endpoint: result.endpoint ?? null,
    modelUsed: result.modelUsed ?? null,
    status: result.status ?? 0,
    success: Boolean(result.ok && result.text),
    inputTokens: result.usage?.inputTokens ?? null,
    outputTokens: result.usage?.outputTokens ?? null,
    totalTokens: result.usage?.totalTokens ?? null,
    durationMs:
      typeof result.durationMs === "number"
        ? Math.max(0, Math.round(result.durationMs))
        : null,
  };
}

export async function logAiUsage(params: AiUsageLogParams) {
  try {
    await prisma.aiUsageEvent.create({
      data: buildAiUsageEventData(params),
      select: { id: true },
    });
  } catch (error) {
    console.warn("Failed to persist AiUsageEvent:", error);
  }
}

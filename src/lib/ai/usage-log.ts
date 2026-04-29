import "server-only";

import type { UpstreamTextResult } from "@/lib/ai/upstream-text";
import { prisma } from "@/lib/prisma";

export async function logAiUsage(params: {
  userId?: string | null;
  action: string;
  result: UpstreamTextResult;
}) {
  const { result } = params;

  try {
    await prisma.aiUsageEvent.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        providerId: result.providerId ?? null,
        endpoint: result.endpoint ?? null,
        modelUsed: result.modelUsed ?? null,
        status: result.status ?? 0,
        success: Boolean(result.ok && result.text),
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        durationMs: typeof result.durationMs === "number" ? Math.max(0, Math.round(result.durationMs)) : null,
      },
      select: { id: true },
    });
  } catch (error) {
    console.warn("Failed to persist AiUsageEvent:", error);
  }
}

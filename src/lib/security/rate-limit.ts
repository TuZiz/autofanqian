import "server-only";

import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";

export type RateLimitDimension = "ip" | "email" | "userId";

export type RateLimitRule = {
  dimension: RateLimitDimension;
  value?: string | null;
  maxAttempts: number;
  windowSeconds: number;
  message: string;
  internalReason?: string;
};

function getWindowStart(windowSeconds: number) {
  return new Date(Date.now() - windowSeconds * 1000);
}

export async function assertLoginRateLimit(rule: RateLimitRule) {
  const value = rule.value?.trim();
  if (!value) return;

  const count = await prisma.loginAttempt.count({
    where: {
      [rule.dimension]: value,
      createdAt: { gte: getWindowStart(rule.windowSeconds) },
    },
  });

  if (count >= rule.maxAttempts) {
    throw new AuthApiError(
      429,
      rule.message,
      undefined,
      rule.internalReason ?? `rate_limited_${rule.dimension}`,
    );
  }
}

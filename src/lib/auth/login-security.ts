import "server-only";

import {
  LOGIN_EMAIL_FAILURE_WINDOW_SECONDS,
  LOGIN_EMAIL_MAX_FAILURES,
  LOGIN_IP_MAX_ATTEMPTS,
  LOGIN_IP_WINDOW_SECONDS,
} from "@/lib/auth/constants";
import { AuthApiError } from "@/lib/auth/errors";
import type { RequestMeta } from "@/lib/auth/request";
import { zhCN } from "@/lib/copy/zh-cn";
import { prisma } from "@/lib/prisma";
import { assertLoginRateLimit } from "@/lib/security/rate-limit";

export type LoginAttemptInput = RequestMeta & {
  email: string;
  success: boolean;
  userId?: string | null;
  failureReason?: string | null;
};

function since(seconds: number) {
  return new Date(Date.now() - seconds * 1000);
}

export async function assertLoginAllowed(email: string, ip?: string) {
  await assertLoginRateLimit({
    dimension: "ip",
    value: ip,
    maxAttempts: LOGIN_IP_MAX_ATTEMPTS,
    windowSeconds: LOGIN_IP_WINDOW_SECONDS,
    message: zhCN.auth.error.loginTooFrequent,
    internalReason: "rate_limited_ip",
  });

  if (!email) {
    return;
  }

  const windowStart = since(LOGIN_EMAIL_FAILURE_WINDOW_SECONDS);
  const latestSuccess = await prisma.loginAttempt.findFirst({
    where: {
      email,
      success: true,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const failureWindowStart =
    latestSuccess && latestSuccess.createdAt > windowStart
      ? latestSuccess.createdAt
      : windowStart;

  const emailFailures = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: failureWindowStart },
    },
  });

  if (emailFailures >= LOGIN_EMAIL_MAX_FAILURES) {
    throw new AuthApiError(
      429,
      zhCN.auth.error.loginTooFrequent,
      undefined,
      "rate_limited_email"
    );
  }
}

export async function recordLoginAttempt(input: LoginAttemptInput) {
  await prisma.loginAttempt
    .create({
      data: {
        email: input.email,
        ip: input.ip,
        userAgent: input.userAgent,
        success: input.success,
        failureReason: input.success ? null : input.failureReason ?? "unknown",
        userId: input.userId ?? null,
      },
      select: { id: true },
    })
    .catch((error) => {
      console.warn("Failed to record login attempt:", error);
    });
}

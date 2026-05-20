import "server-only";

import { prisma } from "@/lib/prisma";

const DEFAULT_LOGIN_ATTEMPT_RETENTION_DAYS = 30;
const DEFAULT_VERIFICATION_CODE_RETENTION_HOURS = 24;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export async function cleanupExpiredSecurityRecords(now = new Date()) {
  const [loginAttempts, emailVerificationCodes, aiQuotaReservations] =
    await prisma.$transaction([
      prisma.loginAttempt.deleteMany({
        where: {
          createdAt: { lt: daysAgo(DEFAULT_LOGIN_ATTEMPT_RETENTION_DAYS) },
        },
      }),
      prisma.emailVerificationCode.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            {
              usedAt: { not: null },
              createdAt: { lt: hoursAgo(DEFAULT_VERIFICATION_CODE_RETENTION_HOURS) },
            },
          ],
        },
      }),
      prisma.aiQuotaReservation.updateMany({
        where: {
          status: "pending",
          expiresAt: { lt: now },
        },
        data: { status: "cancelled" },
      }),
    ]);

  return {
    loginAttempts: loginAttempts.count,
    emailVerificationCodes: emailVerificationCodes.count,
    aiQuotaReservations: aiQuotaReservations.count,
  };
}

import "server-only";

import { createHash, randomInt } from "crypto";

import {
  EmailVerificationPurpose,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_RESEND_SECONDS,
  VERIFICATION_CODE_TTL_SECONDS,
} from "@/lib/auth/constants";
import { AuthApiError } from "@/lib/auth/errors";
import { zhCN } from "@/lib/copy/zh-cn";
import { prisma } from "@/lib/prisma";

type PrismaLikeClient = PrismaClient | Prisma.TransactionClient;

type CreateCodeInput = {
  email: string;
  purpose: EmailVerificationPurpose;
};

type ConsumeCodeInput = {
  email: string;
  purpose: EmailVerificationPurpose;
  code: string;
};

export function generateVerificationCode() {
  const max = 10 ** VERIFICATION_CODE_LENGTH;
  return randomInt(0, max).toString().padStart(VERIFICATION_CODE_LENGTH, "0");
}

export function hashVerificationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function createVerificationCode({
  email,
  purpose,
}: CreateCodeInput) {
  const latestCode = await prisma.emailVerificationCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (latestCode) {
    const secondsSinceLastCode = Math.floor(
      (Date.now() - latestCode.createdAt.getTime()) / 1000
    );

    if (secondsSinceLastCode < VERIFICATION_CODE_RESEND_SECONDS) {
      throw new AuthApiError(
        429,
        zhCN.auth.error.requestCodeTooFast(
          VERIFICATION_CODE_RESEND_SECONDS - secondsSinceLastCode
        )
      );
    }
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(
    Date.now() + VERIFICATION_CODE_TTL_SECONDS * 1000
  );

  const record = await prisma.emailVerificationCode.create({
    data: {
      email,
      purpose,
      codeHash: hashVerificationCode(code),
      expiresAt,
    },
  });

  return {
    code,
    record,
    expiresAt,
    expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS,
    resendAfterSeconds: VERIFICATION_CODE_RESEND_SECONDS,
  };
}

export async function deleteVerificationCode(id: string) {
  await prisma.emailVerificationCode.delete({ where: { id } }).catch(() => {
    return undefined;
  });
}

export async function consumeVerificationCode(
  db: PrismaLikeClient,
  { email, purpose, code }: ConsumeCodeInput
) {
  const record = await db.emailVerificationCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AuthApiError(400, zhCN.auth.error.codeMissing);
  }

  if (record.usedAt) {
    throw new AuthApiError(400, zhCN.auth.error.codeUnavailable);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AuthApiError(400, zhCN.auth.error.codeExpired);
  }

  if (record.codeHash !== hashVerificationCode(code)) {
    throw new AuthApiError(400, zhCN.auth.error.codeIncorrect);
  }

  const updateResult = await db.emailVerificationCode.updateMany({
    where: {
      id: record.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  if (updateResult.count !== 1) {
    throw new AuthApiError(400, zhCN.auth.error.codeUnavailable);
  }

  return record;
}

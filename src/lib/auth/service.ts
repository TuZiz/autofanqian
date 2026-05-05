import "server-only";

import {
  EmailVerificationPurpose,
  Prisma,
} from "@prisma/client";

import { AuthApiError } from "@/lib/auth/errors";
import { zhCN } from "@/lib/copy/zh-cn";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RequestMeta } from "@/lib/auth/request";
import { getCurrentSession, revokeUserSessions } from "@/lib/auth/session";
import { sessionUserSelect } from "@/lib/auth/user";
import { getUniqueConstraintTargets } from "@/lib/auth/user-code";
import {
  consumeVerificationCode,
  createVerificationCode,
  deleteVerificationCode,
} from "@/lib/auth/verification-code";
import { sendVerificationCodeEmail } from "@/lib/mail/auth-mail";
import { prisma } from "@/lib/prisma";

function isUserLoginBlocked(status: string) {
  return status === "banned" || status === "deleted";
}

export async function sendRegisterCode(email: string, meta: RequestMeta = {}) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AuthApiError(409, zhCN.auth.error.emailRegistered, {
      email: [zhCN.auth.error.emailRegistered],
    });
  }

  const verificationCode = await createVerificationCode({
    email,
    purpose: EmailVerificationPurpose.register,
    ...meta,
  });

  try {
    await sendVerificationCodeEmail({
      email,
      code: verificationCode.code,
      purpose: EmailVerificationPurpose.register,
    });
  } catch (error) {
    await deleteVerificationCode(verificationCode.record.id);
    console.error(error);
    throw new AuthApiError(500, zhCN.auth.error.mailSendFailed);
  }

  return {
    email,
    expiresInSeconds: verificationCode.expiresInSeconds,
    resendAfterSeconds: verificationCode.resendAfterSeconds,
  };
}

export async function registerWithCode(
  email: string,
  code: string,
  password: string
) {
  const passwordHash = await hashPassword(password);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new AuthApiError(409, zhCN.auth.error.emailRegistered, {
          email: [zhCN.auth.error.emailRegistered],
        });
      }

      await consumeVerificationCode(tx, {
        email,
        purpose: EmailVerificationPurpose.register,
        code,
      });

      return tx.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
        select: sessionUserSelect,
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = getUniqueConstraintTargets(error);

      if (targets.includes("email")) {
        throw new AuthApiError(409, zhCN.auth.error.emailRegistered);
      }

      if (targets.includes("code")) {
        throw new AuthApiError(503, "用户编码序列冲突，请稍后重试");
      }

      throw new AuthApiError(409, zhCN.auth.error.emailRegistered);
    }

    throw error;
  }
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!user) {
    throw new AuthApiError(
      401,
      zhCN.auth.error.invalidCredentials,
      {
        email: [zhCN.auth.error.invalidCredentials],
        password: [zhCN.auth.error.invalidCredentials],
      },
      "email_not_registered"
    );
  }

  if (isUserLoginBlocked(user.status)) {
    throw new AuthApiError(
      403,
      zhCN.auth.error.accountUnavailable,
      undefined,
      `user_${user.status}`
    );
  }

  if (!user.passwordHash) {
    throw new AuthApiError(
      401,
      zhCN.auth.error.invalidCredentials,
      {
        email: [zhCN.auth.error.invalidCredentials],
        password: [zhCN.auth.error.invalidCredentials],
      },
      "password_missing"
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthApiError(
      401,
      zhCN.auth.error.invalidCredentials,
      {
        email: [zhCN.auth.error.invalidCredentials],
        password: [zhCN.auth.error.invalidCredentials],
      },
      "password_incorrect"
    );
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
    select: sessionUserSelect,
  });
}

export async function sendPasswordResetCode(
  email: string,
  meta: RequestMeta = {}
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!existingUser) {
    throw new AuthApiError(404, zhCN.auth.error.emailNotRegistered, {
      email: [zhCN.auth.error.emailNotRegistered],
    });
  }

  const verificationCode = await createVerificationCode({
    email,
    purpose: EmailVerificationPurpose.reset_password,
    ...meta,
  });

  try {
    await sendVerificationCodeEmail({
      email,
      code: verificationCode.code,
      purpose: EmailVerificationPurpose.reset_password,
    });
  } catch (error) {
    await deleteVerificationCode(verificationCode.record.id);
    console.error(error);
    throw new AuthApiError(500, zhCN.auth.error.mailSendFailed);
  }

  return {
    email,
    expiresInSeconds: verificationCode.expiresInSeconds,
    resendAfterSeconds: verificationCode.resendAfterSeconds,
  };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
) {
  const passwordHash = await hashPassword(newPassword);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });

    if (!existingUser) {
      throw new AuthApiError(404, zhCN.auth.error.emailNotRegistered, {
        email: [zhCN.auth.error.emailNotRegistered],
      });
    }

    if (isUserLoginBlocked(existingUser.status)) {
      throw new AuthApiError(403, zhCN.auth.error.accountUnavailable);
    }

    await consumeVerificationCode(tx, {
      email,
      purpose: EmailVerificationPurpose.reset_password,
      code,
    });

    await tx.userSession.updateMany({
      where: { userId: existingUser.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return tx.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        emailVerified: true,
      },
      select: sessionUserSelect,
    });
  });
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export { revokeUserSessions };

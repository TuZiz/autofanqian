import "server-only";

import {
  EmailVerificationPurpose,
  Prisma,
} from "@prisma/client";

import { AuthApiError } from "@/lib/auth/errors";
import { zhCN } from "@/lib/copy/zh-cn";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSessionUserId } from "@/lib/auth/session";
import { sessionUserSelect } from "@/lib/auth/user";
import {
  consumeVerificationCode,
  createVerificationCode,
  deleteVerificationCode,
} from "@/lib/auth/verification-code";
import { sendVerificationCodeEmail } from "@/lib/mail/auth-mail";
import { prisma } from "@/lib/prisma";

export async function sendRegisterCode(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AuthApiError(409, zhCN.auth.error.emailRegistered);
  }

  const verificationCode = await createVerificationCode({
    email,
    purpose: EmailVerificationPurpose.register,
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
        throw new AuthApiError(409, zhCN.auth.error.emailRegistered);
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
    },
  });

  if (!user) {
    throw new AuthApiError(404, zhCN.auth.error.emailNotRegistered);
  }

  if (!user.passwordHash) {
    throw new AuthApiError(400, zhCN.auth.error.passwordMissing);
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthApiError(401, zhCN.auth.error.passwordIncorrect);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
    select: sessionUserSelect,
  });
}

export async function sendPasswordResetCode(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!existingUser) {
    throw new AuthApiError(404, zhCN.auth.error.emailNotRegistered);
  }

  const verificationCode = await createVerificationCode({
    email,
    purpose: EmailVerificationPurpose.reset_password,
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
      select: { id: true },
    });

    if (!existingUser) {
      throw new AuthApiError(404, zhCN.auth.error.emailNotRegistered);
    }

    await consumeVerificationCode(tx, {
      email,
      purpose: EmailVerificationPurpose.reset_password,
      code,
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
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: sessionUserSelect,
  });
}

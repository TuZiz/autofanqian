import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/constants";
import type { RequestMeta } from "@/lib/auth/request";
import {
  createRawSessionToken,
  hashSessionToken,
  parseSessionToken,
} from "@/lib/auth/session-token";
import { sessionUserSelect } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

const ACCESSIBLE_USER_STATUSES = new Set(["active", "limited"]);

export function getSessionCookieOptions() {
  const explicitSecure = process.env.SESSION_COOKIE_SECURE;

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      explicitSecure === "true" ||
      (explicitSecure !== "false" && process.env.NODE_ENV === "production"),
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  };
}

export async function createSessionCookie(
  userId: string,
  meta: RequestMeta = {}
) {
  const sessionId = crypto.randomUUID();
  const rawToken = createRawSessionToken(sessionId);
  const tokenHash = await hashSessionToken(rawToken);

  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      tokenHash,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
    },
    select: { id: true },
  });

  return {
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    options: getSessionCookieOptions(),
  };
}

export function createClearedSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      ...getSessionCookieOptions(),
      maxAge: 0,
    },
  };
}

async function getRawSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentSession() {
  const token = await getRawSessionToken();
  const parsed = parseSessionToken(token);

  if (!token || !parsed) {
    return null;
  }

  const tokenHash = await hashSessionToken(token);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: sessionUserSelect },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    !ACCESSIBLE_USER_STATUSES.has(session.user.status)
  ) {
    return null;
  }

  await prisma.userSession
    .update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    })
    .catch(() => undefined);

  return session;
}

export async function getSessionUserId() {
  const session = await getCurrentSession();
  return session?.userId ?? null;
}

export async function revokeCurrentSession() {
  const token = await getRawSessionToken();
  const parsed = parseSessionToken(token);

  if (!token || !parsed) {
    return;
  }

  const tokenHash = await hashSessionToken(token);
  await prisma.userSession
    .updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
    .catch(() => undefined);
}

export async function revokeUserSessions(userId: string) {
  await prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

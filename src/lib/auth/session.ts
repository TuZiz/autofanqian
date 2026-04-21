import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/constants";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session-token";

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  };
}

export async function createSessionCookie(userId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: await signSessionToken({ userId }),
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

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  return session?.userId ?? null;
}

import { SignJWT, jwtVerify } from "jose";

import { SESSION_DURATION_SECONDS } from "@/lib/auth/constants";
import { zhCN } from "@/lib/copy/zh-cn";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error(zhCN.auth.error.envMissing("SESSION_SECRET"));
}

const encodedSecret = new TextEncoder().encode(sessionSecret);

export type SessionTokenPayload = {
  userId: string;
};

export async function signSessionToken(payload: SessionTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(encodedSecret);
}

export async function verifySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      algorithms: ["HS256"],
    });

    if (typeof payload.userId !== "string") {
      return null;
    }

    return {
      userId: payload.userId,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

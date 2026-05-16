const SESSION_TOKEN_SECRET_BYTES = 32;
let warnedMissingSessionSecret = false;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production.");
  }

  if (!warnedMissingSessionSecret) {
    warnedMissingSessionSecret = true;
    console.warn(
      "SESSION_SECRET is not configured. Using a development-only session hash key.",
    );
  }

  return "development-only-session-secret-change-me";
}

export function createRawSessionToken(sessionId: string) {
  return `${sessionId}.${randomHex(SESSION_TOKEN_SECRET_BYTES)}`;
}

export function parseSessionToken(token?: string) {
  if (!token) return null;

  const [sessionId, secret, ...extra] = token.split(".");
  if (extra.length || !sessionId || !secret) return null;
  if (sessionId.length > 128 || secret.length !== SESSION_TOKEN_SECRET_BYTES * 2) {
    return null;
  }

  return { sessionId, secret };
}

export async function hashSessionToken(token: string) {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

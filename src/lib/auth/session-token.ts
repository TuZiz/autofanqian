const SESSION_TOKEN_SECRET_BYTES = 32;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return toHex(new Uint8Array(digest));
}

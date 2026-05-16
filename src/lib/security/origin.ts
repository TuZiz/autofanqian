import { AuthApiError } from "@/lib/auth/errors";

function parseTrustedOrigins() {
  return new Set(
    [
      process.env.APP_BASE_URL,
      ...(process.env.TRUSTED_ORIGINS ?? "").split(","),
    ]
      .map((item) => item?.trim())
      .filter(Boolean),
  );
}

function isLocalhostHost(host: string) {
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

export function assertSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    throw new AuthApiError(403, "非法请求来源。");
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new AuthApiError(403, "非法请求来源。");
  }

  if (originUrl.host === host) {
    return;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    isLocalhostHost(originUrl.host) &&
    isLocalhostHost(host)
  ) {
    return;
  }

  if (parseTrustedOrigins().has(origin)) {
    return;
  }

  throw new AuthApiError(403, "非法请求来源。");
}

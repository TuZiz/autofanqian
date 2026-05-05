import "server-only";

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

function firstHeaderIp(value: string | null) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .find(Boolean);
}

export function getRequestMeta(request: Request): RequestMeta {
  const headers = request.headers;
  const ip =
    firstHeaderIp(headers.get("x-forwarded-for")) ??
    firstHeaderIp(headers.get("x-real-ip")) ??
    firstHeaderIp(headers.get("cf-connecting-ip")) ??
    undefined;
  const userAgent = headers.get("user-agent")?.trim().slice(0, 512) || undefined;

  return {
    ip,
    userAgent,
  };
}

export function normalizeAuditEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 320) : "";
}

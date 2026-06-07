import { zhCN } from "@/lib/copy/zh-cn";
import type { ApiFieldErrors } from "@/lib/http/errors";

export type { ApiFieldErrors };

export type AuthApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: ApiFieldErrors;
  status?: number;
};

type AuthApiRequestInit = Omit<RequestInit, "body"> & {
  redirectOnUnauthorized?: boolean;
};

type AuthSuccessPayload<T> = {
  success: true;
  message?: string;
  data?: T;
};

type AuthErrorPayload = {
  success: false;
  message?: string;
  fieldErrors?: ApiFieldErrors;
  code?: string;
};

function isAuthEntryPath(pathname: string) {
  return ["/login", "/register", "/forgot-password"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function apiRequest<T = unknown>(
  url: string,
  payload?: unknown,
  init?: AuthApiRequestInit
): Promise<AuthApiResponse<T>> {
  const { redirectOnUnauthorized = true, ...requestInit } = init ?? {};

  try {
    const headers = new Headers(requestInit.headers);
    if (!headers.has("Content-Type") && payload) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const response = await fetch(url, {
      credentials: "include",
      ...requestInit,
      method: requestInit.method ?? (payload ? "POST" : "GET"),
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const responsePayload = (await response.json().catch(() => null)) as
      | AuthSuccessPayload<T>
      | AuthErrorPayload
      | null;

    if (!response.ok || !responsePayload?.success) {
      const errorPayload =
        responsePayload && !responsePayload.success ? responsePayload : null;

      if (
        response.status === 401 &&
        redirectOnUnauthorized &&
        typeof window !== "undefined" &&
        !isAuthEntryPath(window.location.pathname)
      ) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }

      return {
        success: false,
        status: response.status,
        message:
          response.status === 403
            ? errorPayload?.message || "权限不足，无法执行该操作。"
            : response.status === 429
              ? errorPayload?.message || "请求过于频繁，请稍后再试。"
              : response.status >= 500
                ? "服务异常，请稍后重试。"
                : errorPayload?.message || zhCN.auth.response.networkError,
        fieldErrors: errorPayload?.fieldErrors,
      };
    }

    return {
      success: true,
      message: responsePayload.message || "操作成功。",
      data: responsePayload.data,
    };
  } catch {
    return {
      success: false,
      message: zhCN.auth.response.networkError,
    };
  }
}

export function firstFieldErrors(fieldErrors?: ApiFieldErrors) {
  const errors: Record<string, string> = {};

  if (!fieldErrors) {
    return errors;
  }

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) {
      errors[field] = messages[0];
    }
  }

  return errors;
}

import { zhCN } from "@/lib/copy/zh-cn";
import { apiRequest as requestData } from "@/lib/http/client";
import { ApiClientError, type ApiFieldErrors } from "@/lib/http/errors";

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
    const data = await requestData<T>(url, {
      method: requestInit.method ?? (payload ? "POST" : "GET"),
      headers: requestInit.headers,
      body: payload ? JSON.stringify(payload) : undefined,
      ...requestInit,
    });

    return {
      success: true,
      message: "OK",
      data,
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (
        error.status === 401 &&
        redirectOnUnauthorized &&
        typeof window !== "undefined" &&
        !isAuthEntryPath(window.location.pathname)
      ) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }

      return {
        success: false,
        status: error.status,
        message:
          error.status === 403
            ? error.message || "权限不足，无法执行该操作。"
            : error.status === 429
              ? error.message || "请求过于频繁，请稍后再试。"
              : error.status >= 500
                ? "服务异常，请稍后重试。"
                : error.message || zhCN.auth.response.networkError,
        fieldErrors: error.fieldErrors,
      };
    }

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

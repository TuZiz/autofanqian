import { ApiClientError, type ApiFieldErrors } from "./errors";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  fieldErrors?: ApiFieldErrors;
  code?: string;
};

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError({
      status: 0,
      message: "网络连接失败，请稍后重试。",
      code: "NETWORK_ERROR",
    });
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiError
    | null;

  if (!response.ok || !payload?.success) {
    const errorPayload = payload && !payload.success ? payload : null;
    throw new ApiClientError({
      status: response.status,
      message: errorPayload?.message ?? "请求失败，请稍后重试。",
      fieldErrors: errorPayload?.fieldErrors,
      code: errorPayload?.code,
    });
  }

  return payload.data;
}

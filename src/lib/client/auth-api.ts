import { zhCN } from "@/lib/copy/zh-cn";

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type AuthApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  fieldErrors?: ApiFieldErrors;
  status?: number;
};

export async function apiRequest<T = unknown>(
  url: string,
  payload?: unknown,
  init?: Omit<RequestInit, "body">
): Promise<AuthApiResponse<T>> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: init?.method ?? (payload ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
      body: payload ? JSON.stringify(payload) : undefined,
      ...init,
    });
  } catch {
    return {
      success: false,
      message: zhCN.auth.response.networkError,
    };
  }

  let json: AuthApiResponse<T> | null = null;

  try {
    json = (await response.json()) as AuthApiResponse<T>;
  } catch {
    json = null;
  }

  if (!json) {
    return {
      success: false,
      status: response.status,
      message: response.ok
        ? zhCN.auth.response.emptyResponse
        : zhCN.auth.response.networkError,
    };
  }

  return {
    ...json,
    status: response.status,
  };
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

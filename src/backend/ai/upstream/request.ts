import {
  buildEndpointUrl,
  createManagedAbortSignal,
  getUpstreamTimeoutMs,
} from "./transport";
import type {
  UpstreamChatMessage,
  UpstreamEndpoint,
  UpstreamPhysicalProviderId,
  UpstreamProvider,
  UpstreamReasoningEffort,
} from "./types";

export function getUpstreamMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    error?: { message?: unknown };
    message?: unknown;
  };

  const message = data.error?.message ?? data.message ?? null;
  return typeof message === "string" ? message : null;
}

export function shouldRetryWithAlternateModel(status: number, upstreamMessage: unknown) {
  if (status !== 400 && status !== 404) return false;
  if (typeof upstreamMessage !== "string") return false;
  return /(model|not\s*found|unknown|invalid|不存在|未找到|无效|不支持)/i.test(
    upstreamMessage,
  );
}

export function isRetryableStatus(status: number) {
  return (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 529
  );
}

export function isReasoningEffortRejected(status: number, upstreamMessage: unknown) {
  if (status !== 400) return false;
  if (typeof upstreamMessage !== "string") return false;
  if (!/(reasoning|reasoning_effort)/i.test(upstreamMessage)) return false;

  return /(unknown|unsupported|invalid|not\s*allowed|unrecognized|不支持|未知|无效|不允许)/i.test(
    upstreamMessage,
  );
}

export function getReasoningCacheKey(params: {
  providerId: UpstreamPhysicalProviderId;
  endpoint: UpstreamEndpoint;
  model: string;
}) {
  return `${params.providerId}:${params.endpoint}:${params.model}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getEndpointOrder(prefer: UpstreamProvider["prefer"]) {
  if (prefer === "messages") return ["messages"] as const;
  if (prefer === "responses") return ["responses", "chat"] as const;
  return ["chat", "responses"] as const;
}

export function shouldTryNextEndpoint(status: number, hasText: boolean) {
  return !hasText && (status === 400 || status === 404);
}

function buildAnthropicMessagesUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/messages$/i.test(trimmed)) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}

function buildAnthropicMessagesBody(params: {
  model: string;
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const system = params.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();
  const messages = params.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" as const : "user" as const,
      content: message.content,
    }));

  return {
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    ...(system ? { system } : {}),
    messages: messages.length
      ? messages
      : [{ role: "user" as const, content: "请只回复 OK" }],
  };
}

export async function callAnthropicMessages(
  params: {
    provider: UpstreamProvider;
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    signal?: AbortSignal;
  },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const requestTimeout = createManagedAbortSignal({
    externalSignal: params.signal,
    timeoutMs: getUpstreamTimeoutMs({
      providerId: params.provider.id,
      endpoint: "messages",
      streaming: false,
    }),
  });

  try {
    const response = await fetch(buildAnthropicMessagesUrl(params.provider.baseUrl), {
      method: "POST",
      headers: {
        "x-api-key": params.provider.apiKey,
        "anthropic-version": params.provider.anthropicVersion || "2023-06-01",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        buildAnthropicMessagesBody({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
        }),
      ),
      signal: requestTimeout.signal,
    });

    const json = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, json };
  } catch {
    if (params.signal?.aborted && !requestTimeout.didTimeout()) {
      return {
        ok: false,
        status: 499,
        json: { error: { message: "upstream_aborted" } },
      };
    }

    if (requestTimeout.didTimeout()) {
      return {
        ok: false,
        status: 408,
        json: { error: { message: "上游响应超时" } },
      };
    }

    return {
      ok: false,
      status: 0,
      json: { error: { message: "网络异常或上游服务不可达" } },
    };
  } finally {
    requestTimeout.dispose();
  }
}

export async function callUpstream(
  params: {
    provider: UpstreamProvider;
    endpoint: UpstreamEndpoint;
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
    signal?: AbortSignal;
  },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  if (params.provider.providerType === "anthropic" || params.endpoint === "messages") {
    return callAnthropicMessages({
      provider: params.provider,
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      signal: params.signal,
    });
  }

  const url = buildEndpointUrl(params.provider.baseUrl, params.endpoint);
  const body =
    params.endpoint === "chat"
      ? {
          model: params.model,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          messages: params.messages,
          ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
        }
      : {
          model: params.model,
          temperature: params.temperature,
          max_output_tokens: params.maxTokens,
          input: params.messages.map((message) => ({
            role: message.role,
            content: [{ type: "input_text", text: message.content }],
          })),
          ...(params.reasoningEffort
            ? { reasoning: { effort: params.reasoningEffort } }
            : {}),
        };

  const headers = {
    Authorization: `Bearer ${params.provider.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const requestTimeout = createManagedAbortSignal({
    externalSignal: params.signal,
    timeoutMs: getUpstreamTimeoutMs({
      providerId: params.provider.id,
      endpoint: params.endpoint,
      streaming: false,
    }),
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: requestTimeout.signal,
    });

    const json = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, json };
  } catch {
    if (params.signal?.aborted && !requestTimeout.didTimeout()) {
      return {
        ok: false,
        status: 499,
        json: { error: { message: "upstream_aborted" } },
      };
    }

    if (requestTimeout.didTimeout()) {
      return {
        ok: false,
        status: 408,
        json: { error: { message: "上游响应超时" } },
      };
    }

    return {
      ok: false,
      status: 0,
      json: { error: { message: "网络异常或上游服务不可达" } },
    };
  } finally {
    requestTimeout.dispose();
  }
}

export async function callUpstreamWithRetry(
  params: Parameters<typeof callUpstream>[0] & { attempts?: number },
) {
  const attempts = Math.max(1, Math.min(2, params.attempts ?? 1));
  let last = await callUpstream(params);

  for (let attempt = 1; attempt < attempts; attempt += 1) {
    if (last.ok || !isRetryableStatus(last.status)) {
      return last;
    }

    const baseDelay = 220 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    await sleep(baseDelay + jitter);
    if (params.signal?.aborted) return last;
    last = await callUpstream(params);
  }

  return last;
}

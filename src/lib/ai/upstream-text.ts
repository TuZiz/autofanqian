export type UpstreamChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type UpstreamProviderId = "primary" | "ark" | "anthropic";
export type UpstreamEndpoint = "chat" | "responses" | "anthropic";

export type UpstreamReasoningEffort = "low" | "medium" | "high";

export type UpstreamProvider = {
  id: UpstreamProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  prefer?: UpstreamEndpoint;
};

export type UpstreamTextResult = {
  ok: boolean;
  status: number;
  text?: string;
  upstreamMessage?: string;
  providerId?: UpstreamProviderId;
  endpoint?: UpstreamEndpoint;
  modelUsed?: string;
  usage?: UpstreamTokenUsage;
  durationMs?: number;
};

export type UpstreamTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type UpstreamTextChunk = {
  providerId: UpstreamProviderId;
  endpoint: UpstreamEndpoint;
  modelUsed: string;
  deltaText?: string;
  done?: boolean;
  usage?: UpstreamTokenUsage;
};

const DEFAULT_REASONING_EFFORT: UpstreamReasoningEffort = "high";
const reasoningEffortUnsupported = new Set<string>();

function normalizeModelName(model: string) {
  const trimmed = model.trim();
  if (trimmed === "gpt5.2") return "gpt-5.2";
  if (trimmed === "gpt5.4") return "gpt-5.4";
  return trimmed;
}

function getAlternateModelName(model: string) {
  if (model === "gpt5.2") return "gpt-5.2";
  if (model === "gpt-5.2") return "gpt5.2";
  if (model === "gpt5.4") return "gpt-5.4";
  if (model === "gpt-5.4") return "gpt5.4";
  return null;
}

function isApiVersionBase(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) return true;
  return /\/api\/v\d+$/i.test(trimmed);
}

function buildEndpointUrl(baseUrl: string, endpoint: UpstreamEndpoint) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (endpoint === "anthropic") {
    if (/\/messages$/i.test(trimmed)) return trimmed;
    if (isApiVersionBase(trimmed)) return `${trimmed}/messages`;
    return `${trimmed}/v1/messages`;
  }

  const path = endpoint === "chat" ? "/chat/completions" : "/responses";

  if (isApiVersionBase(trimmed)) {
    return `${trimmed}${path}`;
  }

  return `${trimmed}/v1${path}`;
}

function getUpstreamMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    error?: { message?: unknown };
    message?: unknown;
  };

  const message = data.error?.message ?? data.message ?? null;
  return typeof message === "string" ? message : null;
}

function shouldRetryWithAlternateModel(status: number, upstreamMessage: unknown) {
  if (status !== 400 && status !== 404) return false;
  if (typeof upstreamMessage !== "string") return false;
  return /(model|not\s*found|unknown|invalid|不存在|未找到|无效|不支持)/i.test(
    upstreamMessage,
  );
}

function isRetryableStatus(status: number) {
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

function isReasoningEffortRejected(status: number, upstreamMessage: unknown) {
  if (status !== 400) return false;
  if (typeof upstreamMessage !== "string") return false;
  if (!/(reasoning|reasoning_effort)/i.test(upstreamMessage)) return false;

  return /(unknown|unsupported|invalid|not\s*allowed|unrecognized|不支持|未知|无效|不允许)/i.test(
    upstreamMessage,
  );
}

function getReasoningCacheKey(params: {
  providerId: UpstreamProviderId;
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

function getFirstTextFromChat(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    choices?: Array<{
      message?: { content?: string | null };
      text?: string | null;
    }>;
  };

  const choice = data.choices?.[0];
  const content = choice?.message?.content ?? choice?.text ?? null;
  return typeof content === "string" ? content.trim() : null;
}

function getFirstTextFromResponses(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{ type?: unknown; text?: unknown }> | unknown;
    }>;
    choices?: unknown;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : null;
  if (output) {
    const parts: string[] = [];
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text) {
          parts.push(text);
        }
      }
    }

    const combined = parts.join("").trim();
    if (combined) {
      return combined;
    }
  }

  // Some OpenAI-compatible proxies still respond with Chat Completions shape.
  return getFirstTextFromChat(payload);
}

function getFirstTextFromAnthropic(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    content?: Array<{ type?: unknown; text?: unknown }> | unknown;
  };

  if (!Array.isArray(data.content)) return null;

  const parts: string[] = [];
  for (const item of data.content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as { text?: unknown }).text;
    if (typeof text === "string" && text) {
      parts.push(text);
    }
  }

  const combined = parts.join("").trim();
  return combined || null;
}

function normalizeUsageNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const num = Number.parseInt(value, 10);
    if (Number.isFinite(num)) return Math.max(0, num);
  }

  return undefined;
}

function getTokenUsage(payload: unknown): UpstreamTokenUsage | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return undefined;

  const data = usage as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    inputTokens?: unknown;
    outputTokens?: unknown;
    totalTokens?: unknown;
    promptTokens?: unknown;
    completionTokens?: unknown;
  };

  const inputTokens = normalizeUsageNumber(
    data.input_tokens ?? data.prompt_tokens ?? data.inputTokens ?? data.promptTokens,
  );
  const outputTokens = normalizeUsageNumber(
    data.output_tokens ?? data.completion_tokens ?? data.outputTokens ?? data.completionTokens,
  );
  const totalTokensRaw = normalizeUsageNumber(data.total_tokens ?? data.totalTokens);
  const totalTokens =
    totalTokensRaw ??
    (typeof inputTokens === "number" && typeof outputTokens === "number"
      ? inputTokens + outputTokens
      : undefined);

  if (
    typeof inputTokens !== "number" &&
    typeof outputTokens !== "number" &&
    typeof totalTokens !== "number"
  ) {
    return undefined;
  }

  return { inputTokens, outputTokens, totalTokens };
}

function getAnthropicTokenUsage(payload: unknown): UpstreamTokenUsage | undefined {
  const direct = getTokenUsage(payload);
  if (direct) return direct;

  if (!payload || typeof payload !== "object") return undefined;

  const message = (payload as { message?: unknown }).message;
  if (!message || typeof message !== "object") return undefined;

  return getTokenUsage(message);
}

function buildAnthropicPayload(messages: UpstreamChatMessage[]) {
  const systemParts: string[] = [];
  const conversation: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const message of messages) {
    if (message.role === "system") {
      if (message.content.trim()) {
        systemParts.push(message.content.trim());
      }
      continue;
    }

    conversation.push({
      role: message.role,
      content: message.content,
    });
  }

  const system = systemParts.join("\n\n").trim();
  return {
    system: system || undefined,
    messages: conversation,
  };
}

function getEndpointOrder(prefer: UpstreamProvider["prefer"]) {
  if (prefer === "responses") return ["responses", "chat"] as const;
  if (prefer === "anthropic") return ["anthropic"] as const;
  return ["chat", "responses"] as const;
}

async function callUpstream(
  params: {
    provider: UpstreamProvider;
    endpoint: UpstreamEndpoint;
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
  },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = buildEndpointUrl(params.provider.baseUrl, params.endpoint);

  const reasoningEffort =
    params.endpoint === "anthropic" ? null : params.reasoningEffort ?? null;

  const body = (() => {
    if (params.endpoint === "anthropic") {
      const anthropic = buildAnthropicPayload(params.messages);
      return {
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages: anthropic.messages,
        ...(anthropic.system ? { system: anthropic.system } : {}),
      };
    }

    if (params.endpoint === "chat") {
      return {
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        messages: params.messages,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      };
    }

    return {
      model: params.model,
      temperature: params.temperature,
      max_output_tokens: params.maxTokens,
      input: params.messages.map((message) => ({
        role: message.role,
        content: [
          { type: "input_text", text: message.content },
        ],
      })),
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    };
  })();

  const headers: Record<string, string> =
    params.endpoint === "anthropic"
      ? {
          "x-api-key": params.provider.apiKey,
          "anthropic-version": process.env.ANTHROPIC_VERSION?.trim() || "2023-06-01",
          "Content-Type": "application/json",
          Accept: "application/json",
        }
      : {
          Authorization: `Bearer ${params.provider.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, json };
  } catch {
    return {
      ok: false,
      status: 0,
      json: { error: { message: "网络异常或上游服务不可达" } },
    };
  }
}

async function callUpstreamStream(
  params: {
    provider: UpstreamProvider;
    endpoint: UpstreamEndpoint;
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
    signal?: AbortSignal;
    onChunk?: (chunk: UpstreamTextChunk) => Promise<void> | void;
  },
): Promise<{ ok: boolean; status: number; json: unknown; text?: string }> {
  const url = buildEndpointUrl(params.provider.baseUrl, params.endpoint);
  const reasoningEffort =
    params.endpoint === "anthropic" ? null : params.reasoningEffort ?? null;

  const body = (() => {
    if (params.endpoint === "anthropic") {
      const anthropic = buildAnthropicPayload(params.messages);
      return {
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages: anthropic.messages,
        stream: true,
        ...(anthropic.system ? { system: anthropic.system } : {}),
      };
    }

    if (params.endpoint === "chat") {
      return {
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        messages: params.messages,
        stream: true,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      };
    }

    return {
      model: params.model,
      temperature: params.temperature,
      max_output_tokens: params.maxTokens,
      input: params.messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
      stream: true,
      stream_options: { include_usage: true },
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    };
  })();

  const headers: Record<string, string> =
    params.endpoint === "anthropic"
      ? {
          "x-api-key": params.provider.apiKey,
          "anthropic-version": process.env.ANTHROPIC_VERSION?.trim() || "2023-06-01",
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        }
      : {
          Authorization: `Bearer ${params.provider.apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!response.ok || !response.body) {
      const json = await response.json().catch(() => null as unknown);
      return { ok: response.ok, status: response.status, json };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let combinedText = "";
    let finalUsage: UpstreamTokenUsage | undefined;
    let streamErrorMessage: string | null = null;
    let streamErrorStatus = 502;

    const emitChunk = async (deltaText?: string, done = false) => {
      if (!params.onChunk) return;
      await params.onChunk({
        providerId: params.provider.id,
        endpoint: params.endpoint,
        modelUsed: params.model,
        deltaText,
        done,
        usage: finalUsage,
      });
    };

    const handleSseData = async (data: string) => {
      const trimmed = data.trim();
      if (!trimmed || trimmed === "[DONE]") return;

      let payload: unknown;
      try {
        payload = JSON.parse(trimmed);
      } catch {
        return;
      }

      const usage =
        params.endpoint === "anthropic"
          ? getAnthropicTokenUsage(payload)
          : getTokenUsage(payload);
      if (usage) finalUsage = usage;

      let delta = "";
      if (params.endpoint === "anthropic") {
        const eventType = typeof (payload as { type?: unknown }).type === "string"
          ? String((payload as { type?: unknown }).type)
          : "";

        if (eventType === "content_block_delta") {
          const deltaPart = (payload as {
            delta?: { type?: unknown; text?: unknown };
          }).delta;
          if (deltaPart && typeof deltaPart === "object") {
            const deltaType = (deltaPart as { type?: unknown }).type;
            if (deltaType === "text_delta") {
              const text = (deltaPart as { text?: unknown }).text;
              delta = typeof text === "string" ? text : "";
            }
          }
        } else if (eventType === "error") {
          streamErrorMessage = getUpstreamMessage(payload) ?? "Anthropic 流式响应失败";
          streamErrorStatus = 502;
        }
      } else if (params.endpoint === "chat") {
        const choices = (payload as {
          choices?: Array<{
            delta?: { content?: string | null };
            finish_reason?: string | null;
          }>;
        }).choices;
        const firstChoice = choices?.[0];
        delta = firstChoice?.delta?.content ?? "";
      } else {
        const eventType = typeof (payload as { type?: unknown }).type === "string"
          ? String((payload as { type?: unknown }).type)
          : "";

        if (eventType === "response.output_text.delta") {
          delta = String((payload as { delta?: unknown }).delta ?? "");
        } else if (eventType === "response.completed") {
          const fullText = getFirstTextFromResponses(payload);
          if (fullText && fullText.startsWith(combinedText)) {
            delta = fullText.slice(combinedText.length);
          } else if (fullText && !combinedText) {
            delta = fullText;
          }
        }
      }

      if (delta) {
        combinedText += delta;
        await emitChunk(delta, false);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const lines = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());

        if (!lines.length) continue;
        await handleSseData(lines.join("\n"));
      }
    }

    const remaining = decoder.decode();
    if (remaining) {
      buffer += remaining;
    }
    if (buffer.trim()) {
      const lines = buffer
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (lines.length) {
        await handleSseData(lines.join("\n"));
      }
    }

    if (streamErrorMessage) {
      return {
        ok: false,
        status: streamErrorStatus,
        json: { error: { message: streamErrorMessage } },
        text: combinedText.trim() || undefined,
      };
    }

    await emitChunk(undefined, true);
    return {
      ok: true,
      status: response.status,
      json: { usage: finalUsage },
      text: combinedText.trim(),
    };
  } catch (error) {
    const aborted =
      error instanceof DOMException
        ? error.name === "AbortError"
        : typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: unknown }).name === "AbortError";

    return {
      ok: false,
      status: aborted ? 499 : 0,
      json: { error: { message: aborted ? "用户已取消生成" : "网络异常或上游服务不可达" } },
    };
  }
}

async function callUpstreamWithRetry(
  params: Parameters<typeof callUpstream>[0] & { attempts?: number },
) {
  const attempts = Math.max(1, Math.min(3, params.attempts ?? 2));
  let last = await callUpstream(params);

  for (let attempt = 1; attempt < attempts; attempt += 1) {
    if (last.ok || !isRetryableStatus(last.status)) {
      return last;
    }

    const baseDelay = 340 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    await sleep(baseDelay + jitter);
    last = await callUpstream(params);
  }

  return last;
}

export function getAiProvidersFromEnv() {
  const providers: UpstreamProvider[] = [];

  const primaryKey = process.env.AI_API_KEY?.trim();
  if (primaryKey) {
    providers.push({
      id: "primary",
      baseUrl: process.env.AI_BASE_URL?.trim() || "https://api.99dun.cc",
      apiKey: primaryKey,
      model: normalizeModelName(process.env.AI_MODEL?.trim() || "gpt-5.4"),
      prefer: "chat",
    });
  }

  const arkKey = process.env.ARK_API_KEY?.trim();
  if (arkKey) {
    providers.push({
      id: "ark",
      baseUrl: process.env.ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/v3",
      apiKey: arkKey,
      model: process.env.ARK_MODEL?.trim() || "doubao-seed-2-0-pro-260215",
      prefer: "responses",
    });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    providers.push({
      id: "anthropic",
      baseUrl: process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com",
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514",
      prefer: "anthropic",
    });
  }

  return providers;
}

export function getProviderApiKeyEnvName(providerId: UpstreamProviderId) {
  if (providerId === "primary") return "AI_API_KEY";
  if (providerId === "ark") return "ARK_API_KEY";
  return "ANTHROPIC_API_KEY";
}

export function buildAiProviderChain(params: {
  providers: UpstreamProvider[];
  preferredProviderId: UpstreamProviderId;
  overrideModel?: string | null;
  fallbackToArk?: boolean;
}) {
  const preferredProvider = params.providers.find(
    (provider) => provider.id === params.preferredProviderId,
  );

  if (!preferredProvider) {
    return [];
  }

  const chain: UpstreamProvider[] = [
    {
      ...preferredProvider,
      model: params.overrideModel?.trim() || preferredProvider.model,
    },
  ];

  if (
    (params.fallbackToArk ?? true) &&
    (params.preferredProviderId === "primary" ||
      params.preferredProviderId === "anthropic")
  ) {
    const arkProvider = params.providers.find((provider) => provider.id === "ark");
    if (arkProvider && arkProvider.id !== preferredProvider.id) {
      chain.push(arkProvider);
    }
  }

  return chain;
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

export function getReadableAiErrorMessage(
  result: Pick<UpstreamTextResult, "status" | "upstreamMessage">,
  fallback = "AI 服务调用失败，请稍后重试。",
) {
  const message = result.upstreamMessage?.trim();

  if (result.status === 0) {
    return "AI 服务网络异常或上游不可达，请稍后重试。";
  }

  if (result.status === 401) {
    return "AI 服务鉴权失败，请检查 AI_API_KEY / ARK_API_KEY / ANTHROPIC_API_KEY。";
  }

  if (result.status === 429) {
    return "AI 服务请求过于频繁（上游限流），请稍后重试。";
  }

  if (
    result.status === 503 ||
    (typeof message === "string" &&
      /service temporarily unavailable|service unavailable|temporarily unavailable/i.test(
        message,
      ))
  ) {
    return "AI 服务暂时不可用（上游拥堵或维护），请稍后重试。";
  }

  if (result.status === 502) {
    return "AI 服务暂时不可用（上游网关异常 502），请稍后重试。";
  }

  if (result.status === 504) {
    return "AI 服务响应超时，请稍后重试。";
  }

  if (result.status === 529) {
    return "AI 服务暂时过载，请稍后重试。";
  }

  if (typeof message === "string" && containsChinese(message)) {
    return result.status ? `AI 服务调用失败：${message}（HTTP ${result.status}）` : `AI 服务调用失败：${message}`;
  }

  return fallback;
}

export async function callAiText(params: {
  providers: UpstreamProvider[];
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
  attempts?: number;
  preferredProviderId?: UpstreamProviderId;
  reasoningEffort?: UpstreamReasoningEffort | null;
}) : Promise<UpstreamTextResult> {
  const startedAt = Date.now();
  const getDurationMs = () => Math.max(0, Date.now() - startedAt);

  const reasoningEffort =
    params.reasoningEffort === undefined ? DEFAULT_REASONING_EFFORT : params.reasoningEffort;

  const providers = params.providers.slice();
  if (params.preferredProviderId) {
    providers.sort((a, b) => {
      if (a.id === params.preferredProviderId) return -1;
      if (b.id === params.preferredProviderId) return 1;
      return 0;
    });
  }

  let lastError: UpstreamTextResult = { ok: false, status: 502 };

  for (const provider of providers) {
    const model = normalizeModelName(provider.model);
    const endpoints = getEndpointOrder(provider.prefer);

    for (const endpoint of endpoints) {
      let modelUsed = model;

      const callWithReasoningFallback = async (modelName: string) => {
        const cacheKey = getReasoningCacheKey({
          providerId: provider.id,
          endpoint,
          model: modelName,
        });

        const preferredReasoningEffort =
          endpoint === "anthropic" || reasoningEffortUnsupported.has(cacheKey)
            ? null
            : reasoningEffort;

        let attempt = await callUpstreamWithRetry({
          provider,
          endpoint,
          model: modelName,
          messages: params.messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          attempts: params.attempts,
          reasoningEffort: preferredReasoningEffort,
        });

        if (!attempt.ok && preferredReasoningEffort) {
          const upstreamMessage = getUpstreamMessage(attempt.json);
          if (isReasoningEffortRejected(attempt.status, upstreamMessage)) {
            reasoningEffortUnsupported.add(cacheKey);
            attempt = await callUpstreamWithRetry({
              provider,
              endpoint,
              model: modelName,
              messages: params.messages,
              temperature: params.temperature,
              maxTokens: params.maxTokens,
              attempts: params.attempts,
              reasoningEffort: null,
            });
          }
        }

        return attempt;
      };

      let first = await callWithReasoningFallback(modelUsed);

      if (!first.ok) {
        const upstreamMessage = getUpstreamMessage(first.json);
        const alternateModel = getAlternateModelName(modelUsed);

        if (
          alternateModel &&
          shouldRetryWithAlternateModel(first.status, upstreamMessage)
        ) {
          const retry = await callWithReasoningFallback(alternateModel);

          if (retry.ok) {
            first = retry;
            modelUsed = alternateModel;
          }
        }
      }

      const upstreamMessage = getUpstreamMessage(first.json) ?? undefined;
      const text =
        endpoint === "chat"
          ? getFirstTextFromChat(first.json)
          : endpoint === "responses"
            ? getFirstTextFromResponses(first.json)
            : getFirstTextFromAnthropic(first.json);

      if (first.ok && text) {
        return {
          ok: true,
          status: first.status,
          text,
          upstreamMessage,
          providerId: provider.id,
          endpoint,
          modelUsed,
          usage: getTokenUsage(first.json),
          durationMs: getDurationMs(),
        };
      }

      lastError = {
        ok: false,
        status: first.status,
        upstreamMessage,
        providerId: provider.id,
        endpoint,
        modelUsed,
      };
    }
  }

  return { ...lastError, durationMs: getDurationMs() };
}

export async function streamAiText(params: {
  providers: UpstreamProvider[];
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
  attempts?: number;
  preferredProviderId?: UpstreamProviderId;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
  onChunk?: (chunk: UpstreamTextChunk) => Promise<void> | void;
}): Promise<UpstreamTextResult> {
  const startedAt = Date.now();
  const getDurationMs = () => Math.max(0, Date.now() - startedAt);
  const reasoningEffort =
    params.reasoningEffort === undefined ? DEFAULT_REASONING_EFFORT : params.reasoningEffort;

  const providers = params.providers.slice();
  if (params.preferredProviderId) {
    providers.sort((a, b) => {
      if (a.id === params.preferredProviderId) return -1;
      if (b.id === params.preferredProviderId) return 1;
      return 0;
    });
  }

  let lastError: UpstreamTextResult = { ok: false, status: 502 };

  for (const provider of providers) {
    const model = normalizeModelName(provider.model);
    const endpoints = getEndpointOrder(provider.prefer);

    for (const endpoint of endpoints) {
      const cacheKey = getReasoningCacheKey({
        providerId: provider.id,
        endpoint,
        model,
      });
      const preferredReasoningEffort =
        endpoint === "anthropic" || reasoningEffortUnsupported.has(cacheKey)
          ? null
          : reasoningEffort;

      let streamed = await callUpstreamStream({
        provider,
        endpoint,
        model,
        messages: params.messages,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        reasoningEffort: preferredReasoningEffort,
        signal: params.signal,
        onChunk: params.onChunk,
      });

      if (!streamed.ok && preferredReasoningEffort) {
        const upstreamMessage = getUpstreamMessage(streamed.json);
        if (isReasoningEffortRejected(streamed.status, upstreamMessage)) {
          reasoningEffortUnsupported.add(cacheKey);
          streamed = await callUpstreamStream({
            provider,
            endpoint,
            model,
            messages: params.messages,
            temperature: params.temperature,
            maxTokens: params.maxTokens,
            reasoningEffort: null,
            signal: params.signal,
            onChunk: params.onChunk,
          });
        }
      }

      const upstreamMessage = getUpstreamMessage(streamed.json) ?? undefined;
      if (streamed.ok && streamed.text) {
        return {
          ok: true,
          status: streamed.status,
          text: streamed.text,
          upstreamMessage,
          providerId: provider.id,
          endpoint,
          modelUsed: model,
          usage: getTokenUsage(streamed.json),
          durationMs: getDurationMs(),
        };
      }

      lastError = {
        ok: false,
        status: streamed.status,
        upstreamMessage,
        providerId: provider.id,
        endpoint,
        modelUsed: model,
        durationMs: getDurationMs(),
      };

      if (streamed.status === 499) {
        return lastError;
      }
    }
  }

  return { ...lastError, durationMs: getDurationMs() };
}

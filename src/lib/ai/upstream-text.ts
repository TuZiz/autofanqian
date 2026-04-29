export type UpstreamChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type UpstreamProviderId = "primary" | "ark";

export type UpstreamReasoningEffort = "low" | "medium" | "high";

export type UpstreamProvider = {
  id: UpstreamProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  prefer?: "chat" | "responses";
};

export type UpstreamTextResult = {
  ok: boolean;
  status: number;
  text?: string;
  upstreamMessage?: string;
  providerId?: UpstreamProviderId;
  endpoint?: "chat" | "responses";
  modelUsed?: string;
  usage?: UpstreamTokenUsage;
  durationMs?: number;
};

export type UpstreamTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

const DEFAULT_REASONING_EFFORT: UpstreamReasoningEffort = "high";
const reasoningEffortUnsupported = new Set<string>();

function normalizeModelName(model: string) {
  const trimmed = model.trim();
  if (trimmed === "gpt5.2") return "gpt-5.2";
  return trimmed;
}

function getAlternateModelName(model: string) {
  if (model === "gpt5.2") return "gpt-5.2";
  if (model === "gpt-5.2") return "gpt5.2";
  return null;
}

function isApiVersionBase(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) return true;
  return /\/api\/v\d+$/i.test(trimmed);
}

function buildEndpointUrl(baseUrl: string, endpoint: "chat" | "responses") {
  const trimmed = baseUrl.replace(/\/+$/, "");
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
    status === 504
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
  endpoint: "chat" | "responses";
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

async function callUpstream(
  params: {
    provider: UpstreamProvider;
    endpoint: "chat" | "responses";
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
  },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = buildEndpointUrl(params.provider.baseUrl, params.endpoint);

  const reasoningEffort = params.reasoningEffort ?? null;

  const body =
    params.endpoint === "chat"
      ? {
          model: params.model,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          messages: params.messages,
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        }
      : {
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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.provider.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
      baseUrl: process.env.AI_BASE_URL || "https://api.99dun.cc",
      apiKey: primaryKey,
      model: normalizeModelName(process.env.AI_MODEL || "gpt-5.2"),
      prefer: "chat",
    });
  }

  const arkKey = process.env.ARK_API_KEY?.trim();
  if (arkKey) {
    providers.push({
      id: "ark",
      baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
      apiKey: arkKey,
      model: process.env.ARK_MODEL || "doubao-seed-2-0-pro-260215",
      prefer: "responses",
    });
  }

  return providers;
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
    const endpoints: Array<"chat" | "responses"> =
      provider.prefer === "responses" ? ["responses", "chat"] : ["chat", "responses"];

    for (const endpoint of endpoints) {
      let modelUsed = model;

      const callWithReasoningFallback = async (modelName: string) => {
        const cacheKey = getReasoningCacheKey({
          providerId: provider.id,
          endpoint,
          model: modelName,
        });

        const preferredReasoningEffort =
          reasoningEffortUnsupported.has(cacheKey) ? null : reasoningEffort;

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
          : getFirstTextFromResponses(first.json);

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

import type { UpstreamEndpoint, UpstreamTokenUsage } from "./types";


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

export function getFirstTextFromResponses(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{ type?: unknown; text?: unknown }> | unknown;
    }>;
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

  return getFirstTextFromChat(payload);
}

export function getFirstTextFromAnthropicMessages(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as {
    content?: Array<{
      type?: unknown;
      text?: unknown;
    }>;
  };
  const content = Array.isArray(data.content) ? data.content : [];
  const text = content
    .map((item) => (item.type === "text" && typeof item.text === "string" ? item.text : ""))
    .join("")
    .trim();

  return text || null;
}

export function extractTextFromPayload(endpoint: UpstreamEndpoint, payload: unknown) {
  if (endpoint === "chat") return getFirstTextFromChat(payload);
  if (endpoint === "messages") return getFirstTextFromAnthropicMessages(payload);
  return getFirstTextFromResponses(payload);
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

export function getTokenUsage(payload: unknown): UpstreamTokenUsage | undefined {
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


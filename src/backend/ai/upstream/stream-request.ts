import {
  getFirstTextFromAnthropicMessages,
  getFirstTextFromResponses,
  getTokenUsage,
} from "./response-parser";
import { callAnthropicMessages, getUpstreamMessage } from "./request";
import {
  buildEndpointUrl,
  createManagedAbortSignal,
  getUpstreamTimeoutMs,
} from "./transport";
import type {
  UpstreamChatMessage,
  UpstreamEndpoint,
  UpstreamProvider,
  UpstreamReasoningEffort,
  UpstreamRouteId,
  UpstreamTextChunk,
  UpstreamTokenUsage,
} from "./types";

export async function callUpstreamStream(
  params: {
    provider: UpstreamProvider;
    routeId: UpstreamRouteId;
    endpoint: UpstreamEndpoint;
    model: string;
    messages: UpstreamChatMessage[];
    temperature: number;
    maxTokens: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
    signal?: AbortSignal;
    onChunk?: (chunk: UpstreamTextChunk) => Promise<void> | void;
  },
): Promise<{
  ok: boolean;
  status: number;
  json: unknown;
  text?: string;
  started: boolean;
}> {
  if (params.provider.providerType === "anthropic" || params.endpoint === "messages") {
    const result = await callAnthropicMessages({
      provider: params.provider,
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      signal: params.signal,
    });
    const text = getFirstTextFromAnthropicMessages(result.json) ?? undefined;
    if (result.ok && text && params.onChunk) {
      const usage = getTokenUsage(result.json);
      await params.onChunk({
        routeId: params.routeId,
        providerId: params.provider.id,
        endpoint: "messages",
        modelUsed: params.model,
        deltaText: text,
        usage,
      });
      await params.onChunk({
        routeId: params.routeId,
        providerId: params.provider.id,
        endpoint: "messages",
        modelUsed: params.model,
        done: true,
        usage,
      });
    }

    return {
      ok: result.ok,
      status: result.status,
      json: result.json,
      text,
      started: Boolean(text),
    };
  }

  const url = buildEndpointUrl(params.provider.baseUrl, params.endpoint);
  const body =
    params.endpoint === "chat"
      ? {
          model: params.model,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          messages: params.messages,
          stream: true,
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
          stream: true,
          stream_options: { include_usage: true },
          ...(params.reasoningEffort
            ? { reasoning: { effort: params.reasoningEffort } }
            : {}),
        };

  const headers = {
    Authorization: `Bearer ${params.provider.apiKey}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream, application/json",
  };

  const requestTimeout = createManagedAbortSignal({
    externalSignal: params.signal,
    timeoutMs: getUpstreamTimeoutMs({
      providerId: params.provider.id,
      endpoint: params.endpoint,
      streaming: true,
    }),
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: requestTimeout.signal,
    });

    if (!response.ok || !response.body) {
      const json = await response.json().catch(() => null as unknown);
      return { ok: response.ok, status: response.status, json, started: false };
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
        routeId: params.routeId,
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

      const usage = getTokenUsage(payload);
      if (usage) finalUsage = usage;

      let delta = "";
      if (params.endpoint === "chat") {
        const choices = (payload as {
          choices?: Array<{
            delta?: { content?: string | null };
            finish_reason?: string | null;
          }>;
        }).choices;
        const firstChoice = choices?.[0];
        delta = firstChoice?.delta?.content ?? "";
      } else {
        const eventType =
          typeof (payload as { type?: unknown }).type === "string"
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
        } else if (eventType === "error") {
          streamErrorMessage = getUpstreamMessage(payload) ?? "流式响应失败";
          streamErrorStatus = 502;
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

      requestTimeout.refresh();
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
        started: combinedText.length > 0,
      };
    }

    await emitChunk(undefined, true);
    return {
      ok: true,
      status: response.status,
      json: { usage: finalUsage },
      text: combinedText.trim(),
      started: combinedText.length > 0,
    };
  } catch (error) {
    const aborted =
      error instanceof DOMException
        ? error.name === "AbortError"
        : typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: unknown }).name === "AbortError";

    if (aborted && !requestTimeout.didTimeout()) {
      return {
        ok: false,
        status: 499,
        json: { error: { message: "upstream_aborted" } },
        started: false,
      };
    }

    return {
      ok: false,
      status: requestTimeout.didTimeout() ? 408 : aborted ? 499 : 0,
      json: {
        error: {
          message: requestTimeout.didTimeout()
            ? "upstream_timeout"
            : aborted
              ? "upstream_aborted"
              : "upstream_unreachable",
        },
      },
      started: false,
    };
  } finally {
    requestTimeout.dispose();
  }
}

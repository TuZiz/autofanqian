import { NextResponse } from "next/server";
import { z } from "zod";

import type { ProviderProtocol } from "@/lib/admin/ai-provider-settings-types";
import { errorResponse, parseJsonBody } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiProviderApiKeyForTest } from "@/lib/config/ai-provider-settings";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

type AiProviderTestResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  providerType: string;
  modelUsed?: string;
  modelOptions?: string[];
  modelOptionsMessage?: string;
  textPreview?: string;
  message?: string;
};

type ModelListResult = {
  modelOptions: string[];
  message?: string;
  status?: number;
};

const MODEL_LIST_LIMIT = 40;

const providerSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum(["openai_compatible", "anthropic"]).optional(),
  providerType: z.enum(["openai_compatible", "anthropic"]).optional(),
  protocol: z.enum(["openai_chat", "openai_responses", "anthropic_messages"]),
  label: z.string().trim().max(80),
  enabled: z.boolean().optional(),
  baseUrl: z.string().trim().min(1).max(500),
  model: z.string().trim().min(1).max(160),
  modelOptions: z.array(z.string().trim().min(1).max(160)).optional(),
  hasApiKey: z.boolean().optional(),
  apiKeyPreview: z.string().optional(),
  anthropicVersion: z.string().trim().max(80).optional(),
  apiKey: z.string().max(6000).optional(),
});

const bodySchema = z.object({
  provider: providerSchema,
});

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AuthApiError(400, "Base URL 必须是 http/https URL。");
  }
  return trimmed;
}

function buildOpenAiTestUrl(baseUrl: string, protocol: ProviderProtocol) {
  const trimmed = normalizeBaseUrl(baseUrl);
  const endpoint = protocol === "openai_responses" ? "responses" : "chat/completions";

  if (protocol === "openai_responses" && /\/responses$/i.test(trimmed)) {
    return trimmed;
  }
  if (protocol !== "openai_responses" && /\/chat\/completions$/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1") || /\/api\/v\d+$/i.test(trimmed)) {
    return `${trimmed}/${endpoint}`;
  }
  return `${trimmed}/v1/${endpoint}`;
}

function buildAnthropicTestUrl(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  if (/\/messages$/i.test(trimmed)) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}

function buildOpenAiModelsUrl(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  if (/\/models$/i.test(trimmed)) return trimmed;
  if (trimmed.endsWith("/v1") || /\/api\/v\d+$/i.test(trimmed)) {
    return `${trimmed}/models`;
  }
  return `${trimmed}/v1/models`;
}

function buildAnthropicModelsUrl(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  if (/\/models$/i.test(trimmed)) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/models`;
  return `${trimmed}/v1/models`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readModelId(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return undefined;

  const id = value.id ?? value.name ?? value.model;
  return typeof id === "string" ? id.trim() : undefined;
}

function readModelOptions(payload: unknown) {
  if (!isRecord(payload)) return [];

  const candidates: unknown[] = [];
  const data = payload.data;
  const models = payload.models;

  if (Array.isArray(data)) candidates.push(...data);
  if (Array.isArray(models)) candidates.push(...models);

  return Array.from(
    new Set(
      candidates
        .map(readModelId)
        .filter((model): model is string => Boolean(model)),
    ),
  ).slice(0, MODEL_LIST_LIMIT);
}

function getPayloadMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as {
    error?: { message?: unknown };
    message?: unknown;
  };
  const message = data.error?.message ?? data.message;
  return typeof message === "string" ? message : undefined;
}

function readTextFromChat(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as {
    choices?: Array<{
      message?: { content?: string | null };
      text?: string | null;
    }>;
  };
  const text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text;
  return typeof text === "string" && text.trim() ? text.trim() : undefined;
}

function readTextFromResponses(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as {
    output_text?: unknown;
    output?: Array<{ content?: unknown }>;
  };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts: string[] = [];
  for (const output of data.output ?? []) {
    if (!Array.isArray(output.content)) continue;
    for (const item of output.content) {
      if (!item || typeof item !== "object") continue;
      const text = (item as { text?: unknown }).text;
      if (typeof text === "string" && text) parts.push(text);
    }
  }
  const combined = parts.join("").trim();
  return combined || readTextFromChat(payload);
}

function readTextFromAnthropic(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const data = payload as {
    content?: Array<{ type?: unknown; text?: unknown }>;
  };
  const text = (data.content ?? [])
    .map((item) => (item.type === "text" && typeof item.text === "string" ? item.text : ""))
    .join("")
    .trim();
  return text || undefined;
}

function statusMessage(status: number, upstreamMessage?: string) {
  const prefix = upstreamMessage ? `${upstreamMessage}；` : "";
  if (status === 0) return `${prefix}网络异常或上游服务不可达。`;
  if (status === 401) return `${prefix}认证失败，请检查 API Key。`;
  if (status === 403) return `${prefix}权限不足，请检查账号权限或模型权限。`;
  if (status === 404) return `${prefix}接口或模型不存在，请检查 Base URL、端点和模型名。`;
  if (status === 408) return `${prefix}连接超时，请稍后重试或检查上游服务。`;
  if (status === 429) return `${prefix}请求过于频繁或额度不足，请检查限流和余额。`;
  if (status >= 500) return `${prefix}上游服务异常，请稍后重试。`;
  if (status >= 400) return `${prefix}上游拒绝了请求，请检查配置。`;
  return upstreamMessage;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout() {
      return timedOut;
    },
    dispose() {
      clearTimeout(timeout);
    },
  };
}

async function postJson(params: {
  url: string;
  headers: HeadersInit;
  body: unknown;
}) {
  const timeout = createTimeoutSignal(30_000);
  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: params.headers,
      body: JSON.stringify(params.body),
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return {
      ok: false,
      status: timeout.didTimeout() ? 408 : 0,
      payload: null as unknown,
    };
  } finally {
    timeout.dispose();
  }
}

async function getJson(params: {
  url: string;
  headers: HeadersInit;
}) {
  const timeout = createTimeoutSignal(30_000);
  try {
    const response = await fetch(params.url, {
      method: "GET",
      headers: params.headers,
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => null as unknown);
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return {
      ok: false,
      status: timeout.didTimeout() ? 408 : 0,
      payload: null as unknown,
    };
  } finally {
    timeout.dispose();
  }
}

async function fetchOpenAiCompatibleModels(
  provider: z.infer<typeof providerSchema>,
  apiKey: string,
): Promise<ModelListResult> {
  const result = await getJson({
    url: buildOpenAiModelsUrl(provider.baseUrl),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const upstreamMessage = getPayloadMessage(result.payload);

  if (!result.ok) {
    return {
      modelOptions: [],
      status: result.status,
      message: statusMessage(result.status, upstreamMessage) ?? "连接成功，但模型列表获取失败。",
    };
  }

  const modelOptions = readModelOptions(result.payload);
  return {
    modelOptions,
    ...(modelOptions.length
      ? {}
      : { message: "连接成功，但上游未返回可识别的模型列表。" }),
  };
}

async function fetchAnthropicModels(
  provider: z.infer<typeof providerSchema>,
  apiKey: string,
): Promise<ModelListResult> {
  const result = await getJson({
    url: buildAnthropicModelsUrl(provider.baseUrl),
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": provider.anthropicVersion?.trim() || "2023-06-01",
      Accept: "application/json",
    },
  });
  const upstreamMessage = getPayloadMessage(result.payload);

  if (!result.ok) {
    return {
      modelOptions: [],
      status: result.status,
      message: statusMessage(result.status, upstreamMessage) ?? "连接成功，但模型列表获取失败。",
    };
  }

  const modelOptions = readModelOptions(result.payload);
  return {
    modelOptions,
    ...(modelOptions.length
      ? {}
      : { message: "连接成功，但上游未返回可识别的模型列表。" }),
  };
}

async function testOpenAiCompatible(
  provider: z.infer<typeof providerSchema>,
  apiKey: string,
) {
  const protocol = provider.protocol === "openai_responses" ? "openai_responses" : "openai_chat";
  const url = buildOpenAiTestUrl(provider.baseUrl, protocol);
  const body =
    protocol === "openai_responses"
      ? {
          model: provider.model,
          max_output_tokens: 8,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: "请只回复 OK" }],
            },
          ],
        }
      : {
          model: provider.model,
          max_tokens: 8,
          messages: [{ role: "user", content: "请只回复 OK" }],
        };

  const result = await postJson({
    url,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });
  const upstreamMessage = getPayloadMessage(result.payload);
  const text =
    protocol === "openai_responses"
      ? readTextFromResponses(result.payload)
      : readTextFromChat(result.payload);

  return { ...result, text, upstreamMessage };
}

async function testAnthropic(provider: z.infer<typeof providerSchema>, apiKey: string) {
  const result = await postJson({
    url: buildAnthropicTestUrl(provider.baseUrl),
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": provider.anthropicVersion?.trim() || "2023-06-01",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: {
      model: provider.model,
      max_tokens: 8,
      messages: [{ role: "user", content: "请只回复 OK" }],
    },
  });
  return {
    ...result,
    text: readTextFromAnthropic(result.payload),
    upstreamMessage: getPayloadMessage(result.payload),
  };
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireAdminUser();
    const body = await parseJsonBody(request, bodySchema);
    const apiKey = await getAiProviderApiKeyForTest({
      providerId: body.provider.id,
      temporaryApiKey: body.provider.apiKey,
    });

    if (!apiKey) {
      throw new AuthApiError(400, "请先填写 API Key，或保存已有密钥后再测试连接。");
    }

    const startedAt = Date.now();
    const providerType = body.provider.providerType ?? body.provider.type ?? "openai_compatible";
    const upstream =
      providerType === "anthropic"
        ? await testAnthropic(body.provider, apiKey)
        : await testOpenAiCompatible(body.provider, apiKey);
    const durationMs = Math.max(0, Date.now() - startedAt);
    const modelList =
      upstream.ok && providerType === "anthropic"
        ? await fetchAnthropicModels(body.provider, apiKey)
        : upstream.ok
          ? await fetchOpenAiCompatibleModels(body.provider, apiKey)
          : undefined;
    const message = upstream.ok
      ? "测试连接成功。"
      : statusMessage(upstream.status, upstream.upstreamMessage);
    const result: AiProviderTestResult = {
      ok: upstream.ok,
      status: upstream.status,
      durationMs,
      providerType,
      modelUsed: body.provider.model,
      ...(modelList?.modelOptions.length ? { modelOptions: modelList.modelOptions } : {}),
      ...(modelList?.message ? { modelOptionsMessage: modelList.message } : {}),
      ...(upstream.text ? { textPreview: upstream.text.slice(0, 80) } : {}),
      ...(message ? { message } : {}),
    };

    return NextResponse.json({
      success: true,
      message: result.message || "测试完成。",
      data: result,
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

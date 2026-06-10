import { z } from "zod";

import type {
  AiProviderType,
  ProviderProtocol,
} from "@/lib/admin/ai-provider-settings-types";
import { AuthApiError } from "@/lib/auth/errors";

export const providerSchema = z.object({
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

export type AiProviderPayload = z.infer<typeof providerSchema>;

export type ModelListResult = {
  modelOptions: string[];
  message?: string;
  status?: number;
};

type JsonFetchResult = {
  ok: boolean;
  status: number;
  payload: unknown;
};

type ModelListCandidate = {
  url: string;
  headers: HeadersInit;
};

const MODEL_LIST_LIMIT = 40;
const DEEPSEEK_MODEL_OPTIONS = [
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "deepseek-chat",
  "deepseek-reasoner",
];

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AuthApiError(400, "Base URL 必须是 http/https URL。");
  }
  return trimmed;
}

export function buildOpenAiTestUrl(baseUrl: string, protocol: ProviderProtocol) {
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

export function buildAnthropicTestUrl(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  if (/\/messages$/i.test(trimmed)) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/messages`;
  return `${trimmed}/v1/messages`;
}

function buildOpenAiModelsUrls(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  if (/\/models$/i.test(trimmed)) return [trimmed];
  if (trimmed.endsWith("/v1") || /\/api\/v\d+$/i.test(trimmed)) {
    return [`${trimmed}/models`];
  }
  return [`${trimmed}/v1/models`, `${trimmed}/models`];
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

function getAnthropicOpenAiBaseUrl(baseUrl: string) {
  const trimmed = normalizeBaseUrl(baseUrl);
  const url = new URL(trimmed);
  const pathname = url.pathname.replace(/\/+$/, "");
  const openAiPathname = pathname.replace(
    /\/anthropic(?:\/v\d+)?(?:\/(?:messages|models))?$/i,
    "",
  );

  if (openAiPathname === pathname) return undefined;

  const normalizedPathname = openAiPathname || "/";
  return `${url.origin}${normalizedPathname === "/" ? "" : normalizedPathname}`;
}

function isDeepSeekBaseUrl(baseUrl: string) {
  try {
    const trimmed = normalizeBaseUrl(baseUrl);
    const url = new URL(trimmed);
    return /(^|\.)deepseek\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
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

export function getPayloadMessage(payload: unknown) {
  if (!isRecord(payload)) return undefined;

  const error = payload.error;
  const message = (isRecord(error) ? error.message : undefined) ?? payload.message;
  return typeof message === "string" ? message : undefined;
}

export function statusMessage(status: number, upstreamMessage?: string) {
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

export async function postJson(params: {
  url: string;
  headers: HeadersInit;
  body: unknown;
}): Promise<JsonFetchResult> {
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
}): Promise<JsonFetchResult> {
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

async function fetchModelListFromCandidates(
  candidates: ModelListCandidate[],
): Promise<ModelListResult> {
  let lastFailure: ModelListResult | undefined;

  for (const candidate of candidates) {
    const result = await getJson(candidate);
    const upstreamMessage = getPayloadMessage(result.payload);

    if (!result.ok) {
      lastFailure = {
        modelOptions: [],
        status: result.status,
        message: statusMessage(result.status, upstreamMessage) ?? "模型列表获取失败。",
      };
      continue;
    }

    const modelOptions = readModelOptions(result.payload);
    if (modelOptions.length) return { modelOptions };

    lastFailure = {
      modelOptions: [],
      status: result.status,
      message: "上游未返回可识别的模型列表。",
    };
  }

  return lastFailure ?? { modelOptions: [], message: "模型列表获取失败。" };
}

function getDeepSeekModelFallback(baseUrl: string): ModelListResult | undefined {
  if (!isDeepSeekBaseUrl(baseUrl)) return undefined;

  return {
    modelOptions: DEEPSEEK_MODEL_OPTIONS,
    message: "DeepSeek 未返回模型列表，已使用官方模型候选。",
  };
}

async function fetchOpenAiCompatibleModels(
  provider: AiProviderPayload,
  apiKey: string,
): Promise<ModelListResult> {
  const result = await fetchModelListFromCandidates(
    buildOpenAiModelsUrls(provider.baseUrl).map((url) => ({
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })),
  );

  return result.modelOptions.length
    ? result
    : getDeepSeekModelFallback(provider.baseUrl) ?? result;
}

async function fetchAnthropicModels(
  provider: AiProviderPayload,
  apiKey: string,
): Promise<ModelListResult> {
  const candidates: ModelListCandidate[] = [
    {
      url: buildAnthropicModelsUrl(provider.baseUrl),
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": provider.anthropicVersion?.trim() || "2023-06-01",
        Accept: "application/json",
      },
    },
  ];
  const openAiBaseUrl = getAnthropicOpenAiBaseUrl(provider.baseUrl);
  if (openAiBaseUrl) {
    candidates.push(
      ...buildOpenAiModelsUrls(openAiBaseUrl).map((url) => ({
        url,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      })),
    );
  }

  const result = await fetchModelListFromCandidates(candidates);
  return result.modelOptions.length
    ? result
    : getDeepSeekModelFallback(provider.baseUrl) ?? result;
}

export async function fetchProviderModels(
  provider: AiProviderPayload,
  apiKey: string,
  providerType: AiProviderType = provider.providerType ?? provider.type ?? "openai_compatible",
): Promise<ModelListResult> {
  return providerType === "anthropic"
    ? fetchAnthropicModels(provider, apiKey)
    : fetchOpenAiCompatibleModels(provider, apiKey);
}

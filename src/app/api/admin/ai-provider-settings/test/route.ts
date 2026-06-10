import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, parseJsonBody } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiProviderApiKeyForTest } from "@/lib/config/ai-provider-settings";
import { assertSameOriginRequest } from "@/lib/security/origin";

import {
  buildAnthropicTestUrl,
  buildOpenAiTestUrl,
  fetchProviderModels,
  getPayloadMessage,
  postJson,
  providerSchema,
  statusMessage,
  type AiProviderPayload,
} from "../provider-upstream";

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

const bodySchema = z.object({
  provider: providerSchema,
});

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

async function testOpenAiCompatible(
  provider: AiProviderPayload,
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

async function testAnthropic(provider: AiProviderPayload, apiKey: string) {
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
      upstream.ok ? await fetchProviderModels(body.provider, apiKey, providerType) : undefined;
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

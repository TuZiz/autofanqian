import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { getAiModelConfig, updateAiModelConfig } from "@/lib/config/ai-model";

export const runtime = "nodejs";

const bodySchema = z.object({
  config: z.unknown(),
});

function readEnv(keys: string[], fallback = "") {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return fallback;
}

function parseModelOptions(raw: string | undefined, fallbackModel: string) {
  const values = (raw || "")
    .split(/[\n,;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const merged = [fallbackModel, ...values].filter(Boolean);
  return Array.from(new Set(merged));
}

function getProviderOptionsFromEnv() {
  const primaryKey = process.env.AI_API_KEY?.trim();
  const arkKey = process.env.ARK_API_KEY?.trim();
  const primaryModel = (process.env.AI_MODEL || "gpt-5.2").trim();
  const arkModel = (process.env.ARK_MODEL || "doubao-seed-2-0-pro-260215").trim();

  return [
    {
      id: "primary" as const,
      label: readEnv(["AI_PROVIDER_LABEL", "AI_PROVIDER_NAME"], "主线路"),
      configured: Boolean(primaryKey),
      apiKeyEnvKey: "AI_API_KEY",
      envModelKey: "AI_MODEL",
      model: primaryModel,
      modelOptions: parseModelOptions(process.env.AI_MODEL_OPTIONS, primaryModel),
      baseUrl: (process.env.AI_BASE_URL || "https://api.99dun.cc").trim(),
      prefer: "chat" as const,
    },
    {
      id: "ark" as const,
      label: readEnv(["ARK_PROVIDER_LABEL", "ARK_PROVIDER_NAME"], "豆包"),
      configured: Boolean(arkKey),
      apiKeyEnvKey: "ARK_API_KEY",
      envModelKey: "ARK_MODEL",
      model: arkModel,
      modelOptions: parseModelOptions(process.env.ARK_MODEL_OPTIONS, arkModel),
      baseUrl: (
        process.env.ARK_BASE_URL ||
        "https://ark.cn-beijing.volces.com/api/v3"
      ).trim(),
      prefer: "responses" as const,
    },
  ];
}

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getAiModelConfig();

    return successResponse(
      { config, providers: getProviderOptionsFromEnv() },
      { message: "AI 模型配置已加载。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();
    const body = await parseJsonBody(request, bodySchema);
    const config = await updateAiModelConfig(body.config);
    return successResponse({ config }, { message: "AI 模型配置已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

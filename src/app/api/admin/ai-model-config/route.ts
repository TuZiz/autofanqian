import { z } from "zod";

import type {
  AiModelConfigResponse,
  PhysicalProviderOption,
  ProviderOption,
} from "@/lib/admin/ai-model-types";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import {
  getAiPhysicalProviderConfigsFromEnv,
  getAiRouteConfigsFromEnv,
} from "@/lib/ai/upstream-text";
import { getAiModelConfig, updateAiModelConfig } from "@/lib/config/ai-model";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  config: z.unknown(),
});

function buildResponsePayload(config: Awaited<ReturnType<typeof getAiModelConfig>>): AiModelConfigResponse {
  const providers: ProviderOption[] = getAiRouteConfigsFromEnv().map((route) => ({
    id: route.id,
    label: route.label,
    configured: route.configured,
    routeChain: route.routeChain,
    envSummary: route.envSummary,
    model: route.model,
    modelOptions: route.modelOptions,
    baseUrl: route.baseUrl,
    prefer: route.prefer,
  }));

  const physicalProviders: PhysicalProviderOption[] = getAiPhysicalProviderConfigsFromEnv().map(
    (provider) => ({
      id: provider.id,
      label: provider.label,
      configured: provider.configured,
      apiKeyEnvKey: provider.apiKeyEnvKey,
      envModelKey: provider.envModelKey,
      model: provider.model,
      modelOptions: provider.modelOptions,
      baseUrl: provider.baseUrl,
      prefer: provider.prefer,
    }),
  );

  return { config, providers, physicalProviders };
}

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getAiModelConfig();

    return successResponse(buildResponsePayload(config), {
      message: "AI 模型配置已加载。",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  assertSameOriginRequest(request);
  try {
    const adminUser = await requireAdminUser();
    const before = await getAiModelConfig();
    const body = await parseJsonBody(request, bodySchema);
    const config = await updateAiModelConfig(body.config);
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "ai_model_config.update",
      targetType: "AppConfig",
      targetId: "ai_model_config",
      before,
      after: config,
    });

    return successResponse({ config }, { message: "AI 模型配置已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

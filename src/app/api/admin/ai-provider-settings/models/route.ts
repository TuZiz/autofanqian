import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getAiProviderApiKeyForTest } from "@/lib/config/ai-provider-settings";
import { assertSameOriginRequest } from "@/lib/security/origin";

import {
  fetchProviderModels,
  providerSchema,
} from "../provider-upstream";

export const runtime = "nodejs";

const bodySchema = z.object({
  provider: providerSchema,
});

function getModelListErrorStatus(upstreamStatus?: number) {
  if (!upstreamStatus) return 502;
  if (upstreamStatus === 408) return 408;
  if (upstreamStatus === 429) return 429;
  if (upstreamStatus >= 500) return 502;
  return 400;
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
      throw new AuthApiError(400, "请先填写 API Key，或保存已有密钥后再获取模型。");
    }

    const providerType = body.provider.providerType ?? body.provider.type ?? "openai_compatible";
    const modelList = await fetchProviderModels(body.provider, apiKey, providerType);

    if (!modelList.modelOptions.length) {
      throw new AuthApiError(
        getModelListErrorStatus(modelList.status),
        modelList.message || "模型列表获取失败，请检查接口地址和 API Key。",
      );
    }

    const count = modelList.modelOptions.length;
    return successResponse(
      {
        modelOptions: modelList.modelOptions,
        ...(modelList.message ? { message: modelList.message } : {}),
      },
      { message: `已获取 ${count} 个模型。` },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

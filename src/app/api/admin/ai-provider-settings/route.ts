import { z } from "zod";

import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  AI_PROVIDER_SETTINGS_KEY,
  getAiProviderSettings,
  updateAiProviderSettings,
} from "@/lib/config/ai-provider-settings";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  settings: z.unknown(),
});

export async function GET() {
  try {
    await requireAdminUser();
    const settings = await getAiProviderSettings();

    return successResponse(
      { settings },
      { message: "AI Provider 配置已加载。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const before = await getAiProviderSettings();
    const body = await parseJsonBody(request, bodySchema);
    const settings = await updateAiProviderSettings(body.settings);

    await recordAdminAuditLog({
      request,
      adminUser,
      action: "ai_provider_settings.update",
      targetType: "AppConfig",
      targetId: AI_PROVIDER_SETTINGS_KEY,
      before,
      after: settings,
    });

    return successResponse(
      { settings },
      { message: "AI Provider 配置已保存，新的 AI 请求会立即按该配置生效。" },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { updateCreateUiConfig, getCreateUiConfig } from "@/lib/config/create-ui";
import { z } from "zod";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  config: z.unknown(),
});

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getCreateUiConfig();
    return successResponse({ config }, { message: "管理员配置已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOriginRequest(request);
    const adminUser = await requireAdminUser();
    const before = await getCreateUiConfig();
    const body = await parseJsonBody(request, bodySchema);
    const config = await updateCreateUiConfig(body.config);
    await recordAdminAuditLog({
      request,
      adminUser,
      action: "create_config.update",
      targetType: "AppConfig",
      targetId: "create_ui_config",
      before,
      after: config,
    });
    return successResponse({ config }, { message: "配置已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

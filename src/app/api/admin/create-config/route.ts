import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { updateCreateUiConfig, getCreateUiConfig } from "@/lib/config/create-ui";
import { z } from "zod";

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
    await requireAdminUser();
    const body = await parseJsonBody(request, bodySchema);
    const config = await updateCreateUiConfig(body.config);
    return successResponse({ config }, { message: "配置已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}


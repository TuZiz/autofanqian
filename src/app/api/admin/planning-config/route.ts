import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { getPlanningConfig, updatePlanningConfig } from "@/lib/config/planning";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

const bodySchema = z.object({
  config: z.unknown(),
});

export async function GET() {
  try {
    await requireAdminUser();
    const config = await getPlanningConfig();
    return successResponse({ config }, { message: "规划参数已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  assertSameOriginRequest(request);
  try {
    await requireAdminUser();
    const body = await parseJsonBody(request, bodySchema);
    const config = await updatePlanningConfig(body.config);
    return successResponse({ config }, { message: "规划参数已保存。" });
  } catch (error) {
    return errorResponse(error);
  }
}

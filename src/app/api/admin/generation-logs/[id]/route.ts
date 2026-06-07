import { z } from "zod";

import { getGenerationLogDetail } from "@/backend/admin/generation-logs-service";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ id: rawParams.id ?? "" });
    const job = await getGenerationLogDetail(params.id);

    if (!job) {
      throw new AuthApiError(404, "生成任务不存在。");
    }

    return successResponse({ job }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { toSafeDeployJob } from "@/lib/system/deploy";

export const runtime = "nodejs";

const paramsSchema = z.object({
  jobId: z.string().min(1).max(128),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId?: string }> },
) {
  try {
    await requireAdminUser();
    const rawParams = await context.params;
    const params = paramsSchema.parse({ jobId: rawParams.jobId ?? "" });
    const job = await prisma.deployJob.findUnique({ where: { id: params.jobId } });
    if (!job) {
      throw new AuthApiError(404, "更新任务不存在。");
    }

    return successResponse({ job: toSafeDeployJob(job) }, { message: "更新任务已加载。" });
  } catch (error) {
    return errorResponse(error);
  }
}

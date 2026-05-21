import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { runPendingGenerationJobs } from "@/lib/jobs/generation-job-runner";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
  jobId: z.string().trim().min(1).max(64).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireAdminUser();
    const body = await parseJsonBody(request, bodySchema);
    const result = await runPendingGenerationJobs(body);
    return successResponse(result, { message: "后台任务执行完成。" });
  } catch (error) {
    return errorResponse(error);
  }
}

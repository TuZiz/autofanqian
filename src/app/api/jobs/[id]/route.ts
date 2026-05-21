import { errorResponse, successResponse } from "@/lib/auth/api";
import {
  requireGenerationJobAccess,
  serializeGenerationJob,
} from "@/lib/jobs/generation-job-view";
import { generationJobIdParamsSchema } from "@/shared/schemas/generation-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = generationJobIdParamsSchema.parse({ id: rawParams.id ?? "" });
    const { job } = await requireGenerationJobAccess(params.id);
    return successResponse(serializeGenerationJob(job), { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

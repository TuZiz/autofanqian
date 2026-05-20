import { z } from "zod";

import { getChapterQualityReport } from "@/lib/ai/chapter-quality-report";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  workId: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ workId?: string; index?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      workId: rawParams.workId ?? "",
      index: rawParams.index ?? "",
    });

    await requireWorkAccess(params.workId);
    const report = await getChapterQualityReport(params.workId, params.index);

    return successResponse(report, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

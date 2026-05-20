import { z } from "zod";

import { getAuxiliaryAiCostReport } from "@/lib/ai/auxiliary-cost-report";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { parseDateRangeFromSearchParams } from "@/lib/http/date-range";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  workId: z.string().min(1).max(64),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ workId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ workId: rawParams.workId ?? "" });
    const { from, to } = parseDateRangeFromSearchParams(new URL(request.url).searchParams);

    await requireWorkAccess(params.workId);
    const report = await getAuxiliaryAiCostReport(params.workId, { from, to });

    return successResponse(report, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

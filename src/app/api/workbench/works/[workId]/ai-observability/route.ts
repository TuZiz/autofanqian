import { z } from "zod";

import { getWorkAiObservability } from "@/lib/ai/work-ai-observability";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { parseDateRangeFromSearchParams } from "@/lib/http/date-range";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  workId: z.string().min(1).max(64),
});

const querySchema = z.object({
  trendLimit: z.coerce.number().int().min(1).max(100).optional(),
  modelMinJobs: z.coerce.number().int().min(1).max(100).optional(),
  chapterLimit: z.coerce.number().int().min(1).max(300).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ workId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ workId: rawParams.workId ?? "" });
    const searchParams = new URL(request.url).searchParams;
    const query = querySchema.parse(Object.fromEntries(searchParams));
    const { from, to } = parseDateRangeFromSearchParams(searchParams);

    await requireWorkAccess(params.workId);
    const data = await getWorkAiObservability(params.workId, {
      from,
      to,
      trendLimit: query.trendLimit,
      modelMinJobs: query.modelMinJobs,
      chapterLimit: query.chapterLimit,
    });

    return successResponse(data, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

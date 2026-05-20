import { z } from "zod";

import { getWorkQualityTrend } from "@/lib/ai/work-quality-trend";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  workId: z.string().min(1).max(64),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  orderBy: z.enum(["chapterIndex", "updatedAt"]).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ workId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ workId: rawParams.workId ?? "" });
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    await requireWorkAccess(params.workId);
    const items = await getWorkQualityTrend(params.workId, {
      limit: query.limit,
      orderBy: query.orderBy,
    });

    return successResponse({ items }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

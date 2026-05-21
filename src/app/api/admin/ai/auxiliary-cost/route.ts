import { z } from "zod";

import {
  getGlobalAuxiliaryAiCostReport,
  type AuxiliaryAiCostAction,
} from "@/lib/ai/auxiliary-cost-report";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { parseDateRangeFromSearchParams } from "@/lib/http/date-range";
import { AI_ACTIONS } from "@/shared/ai-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.enum([
  "chapter.plan",
  AI_ACTIONS.chapterConsistency,
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
]);

const querySchema = z.object({
  userId: z.string().min(1).max(64).optional(),
  workId: z.string().min(1).max(64).optional(),
  action: actionSchema.optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const searchParams = new URL(request.url).searchParams;
    const query = querySchema.parse(Object.fromEntries(searchParams));
    const { from, to } = parseDateRangeFromSearchParams(searchParams);

    const report = await getGlobalAuxiliaryAiCostReport({
      from,
      to,
      userId: query.userId,
      workId: query.workId,
      action: query.action as AuxiliaryAiCostAction | undefined,
    });

    return successResponse(report, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

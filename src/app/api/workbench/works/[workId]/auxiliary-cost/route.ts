import { z } from "zod";

import { getAuxiliaryAiCostReport } from "@/lib/ai/auxiliary-cost-report";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  workId: z.string().min(1).max(64),
});

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

function parseOptionalDate(value: string | undefined, field: "from" | "to") {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AuthApiError(400, `${field} must be a valid ISO date.`);
  }
  return date;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({ workId: rawParams.workId ?? "" });
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const from = parseOptionalDate(query.from, "from");
    const to = parseOptionalDate(query.to, "to");

    await requireWorkAccess(params.workId);
    const report = await getAuxiliaryAiCostReport(params.workId, { from, to });

    return successResponse(report, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

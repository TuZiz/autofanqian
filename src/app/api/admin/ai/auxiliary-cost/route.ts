import { z } from "zod";

import {
  getGlobalAuxiliaryAiCostReport,
  type AuxiliaryAiCostAction,
} from "@/lib/ai/auxiliary-cost-report";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.enum([
  "chapter.plan",
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
]);

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().min(1).max(64).optional(),
  workId: z.string().min(1).max(64).optional(),
  action: actionSchema.optional(),
});

function parseOptionalDate(value: string | undefined, field: "from" | "to") {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AuthApiError(400, `${field} must be a valid ISO date.`);
  }
  return date;
}

function assertValidRange(from: Date | undefined, to: Date | undefined) {
  if (from && to && from.getTime() > to.getTime()) {
    throw new AuthApiError(400, "from must be earlier than to.");
  }
}

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const from = parseOptionalDate(query.from, "from");
    const to = parseOptionalDate(query.to, "to");
    assertValidRange(from, to);

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

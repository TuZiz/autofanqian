import { z } from "zod";

import { listGenerationLogs } from "@/backend/admin/generation-logs-service";
import { generationLogStatusFilters } from "@/lib/admin/generation-log-types";
import { requireAdminUser } from "@/lib/auth/admin";
import { errorResponse, successResponse } from "@/lib/auth/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  cursor: z.string().trim().min(1).max(128).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(generationLogStatusFilters).optional().default("all"),
  take: z.coerce.number().int().refine((value) => [20, 50, 100].includes(value), {
    message: "take 只能是 20、50 或 100。",
  }).optional().default(50),
});

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const query = querySchema.parse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      take: url.searchParams.get("take") ?? undefined,
    });
    const data = await listGenerationLogs(query);

    return successResponse(data, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

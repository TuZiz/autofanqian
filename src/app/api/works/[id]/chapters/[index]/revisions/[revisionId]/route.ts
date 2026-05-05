import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { prisma } from "@/lib/prisma";
import { serializeRevision } from "@/lib/workbench/chapter-revisions";
import { requireWorkAccess } from "@/lib/works/access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
  index: z.coerce.number().int().min(1).max(9999),
  revisionId: z.string().min(1).max(64),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id?: string; index?: string; revisionId?: string }> },
) {
  try {
    const rawParams = await context.params;
    const params = paramsSchema.parse({
      id: rawParams.id ?? "",
      index: rawParams.index ?? "",
      revisionId: rawParams.revisionId ?? "",
    });
    const { work } = await requireWorkAccess(params.id);

    const revision = await prisma.chapterRevision.findFirst({
      where: {
        id: params.revisionId,
        workId: work.id,
        index: params.index,
      },
    });

    if (!revision) {
      throw new AuthApiError(404, "历史版本不存在。");
    }

    return successResponse({ revision: serializeRevision(revision) }, { message: "OK" });
  } catch (error) {
    return errorResponse(error);
  }
}

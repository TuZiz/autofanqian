import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getDashboardAiStatus } from "@/backend/dashboard/ai-status-service";
import { isAdminUser } from "@/lib/auth/admin";
import { successResponse, errorResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dashboardAiStatusQuerySchema = z.object({
  chapterIndex: z.coerce.number().int().positive().optional(),
  workId: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const url = new URL(request.url);
    const query = dashboardAiStatusQuerySchema.parse({
      chapterIndex: url.searchParams.get("chapterIndex") ?? undefined,
      workId: url.searchParams.get("workId") ?? undefined,
    });

    const data = await getDashboardAiStatus({
      chapterIndex: query.chapterIndex,
      isAdmin: isAdminUser(user),
      userId: user.id,
      workId: query.workId,
    });

    return successResponse(data, { message: "OK" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据表尚未迁移完成，请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

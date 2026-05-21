import { Prisma } from "@prisma/client";

import { confirmImportedWork } from "@/backend/works/work-import-service";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { assertCanCreateWork } from "@/lib/membership/guards";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { workImportConfirmSchema } from "@/shared/schemas/work-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, workImportConfirmSchema);
    await assertCanCreateWork(user);

    return successResponse(
      await confirmImportedWork({ body, userId: user.id }),
      { message: "作品已导入。" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return errorResponse(
        new AuthApiError(
          500,
          "数据表尚未迁移完成：请先运行 start-dev.cmd 或执行 prisma migrate deploy。",
        ),
      );
    }

    return errorResponse(error);
  }
}

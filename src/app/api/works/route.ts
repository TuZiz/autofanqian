import { Prisma } from "@prisma/client";

import { createWorkFromDraft } from "@/backend/works/work-create-service";
import { listWorksForUser } from "@/backend/works/work-list-service";
import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/service";
import { assertCanCreateWork } from "@/lib/membership/guards";
import {
  workCreateBodySchema,
  workListQuerySchema,
} from "@/shared/schemas/work-api";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const isAdmin = isAdminUser(user);
    const url = new URL(request.url);
    const query = workListQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      genreId: url.searchParams.get("genreId") ?? undefined,
      tag: url.searchParams.get("tag") ?? undefined,
      owner: url.searchParams.get("owner") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    return successResponse(
      await listWorksForUser({ isAdmin, query, userId: user.id }),
      { message: "OK" },
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

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
    }

    const body = await parseJsonBody(request, workCreateBodySchema);
    await assertCanCreateWork(user);

    return successResponse(
      await createWorkFromDraft({ body, userId: user.id }),
      { message: "作品已创建。" },
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

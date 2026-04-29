import { Prisma } from "@prisma/client";
import { z } from "zod";

import { errorResponse, parseJsonBody, successResponse } from "@/lib/auth/api";
import { isAdminEmail } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { sessionUserSelect } from "@/lib/auth/user";
import { zhCN } from "@/lib/copy/zh-cn";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().max(64, "昵称不能超过 64 个字符。").optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new AuthApiError(401, zhCN.auth.response.unauthenticated);
    }

    const body = await parseJsonBody(request, profileSchema);
    const nextName =
      body.name === undefined ? undefined : body.name?.trim() ? body.name.trim() : null;

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name: nextName,
      },
      select: sessionUserSelect,
    });

    return successResponse(
      {
        user: {
          ...user,
          isAdmin: isAdminEmail(user.email),
        },
      },
      { message: "个人信息已保存。" },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(new AuthApiError(404, "当前账号不存在，请重新登录。"));
    }

    return errorResponse(error);
  }
}

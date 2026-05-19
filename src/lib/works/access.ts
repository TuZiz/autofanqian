import "server-only";

import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/service";
import { prisma } from "@/lib/prisma";

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthApiError(401, "未登录或登录已失效，请先登录。");
  }

  return user;
}

export async function requireWorkAccess(workId: string, options?: { allowDeleted?: boolean }) {
  const user = await requireCurrentUser();
  const isAdmin = isAdminUser(user);
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      userId: true,
      workType: true,
      title: true,
      tag: true,
      outline: true,
      targetChapters: true,
      plannedUntilChapter: true,
      deletedAt: true,
    },
  });

  if (!work || (!options?.allowDeleted && work.deletedAt)) {
    throw new AuthApiError(404, "作品不存在或已被删除。");
  }

  if (!isAdmin && work.userId !== user.id) {
    throw new AuthApiError(403, "无权限访问该作品。");
  }

  return { user, isAdmin, work };
}

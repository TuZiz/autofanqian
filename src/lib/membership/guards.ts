import "server-only";

import type { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { getMembershipLimits } from "@/lib/membership/limits";
import {
  assertMembershipCountAvailable,
  isUnlimitedMembershipLimit,
} from "@/lib/membership/rules";
import { prisma } from "@/lib/prisma";

export type MembershipGuardUser = {
  id: string;
  email: string;
  role?: string | null;
  membershipTier?: string | null;
};

type ActionLimit = {
  actionName: string;
  actions: string[];
  limit: number;
};

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export function getAiActionLimit(params: {
  action: string;
  dailyLongNovelOutlines: number;
  dailyShortStoryOutlines: number;
  dailyIdeaGenerations: number;
  dailyIdeaAnalyses: number;
  dailyChapterGenerations: number;
  dailyChapterSummaries: number;
  dailyChapterOutlines: number;
  dailyChapterDetails: number;
}): ActionLimit | null {
  if (params.action === "short_story_outline_generate") {
    return {
      actionName: "短篇大纲",
      actions: ["short_story_outline_generate"],
      limit: params.dailyShortStoryOutlines,
    };
  }

  if (params.action === "outline_generate" || params.action === "outline_extend") {
    return {
      actionName: "长篇大纲",
      actions: ["outline_generate", "outline_extend"],
      limit: params.dailyLongNovelOutlines,
    };
  }

  if (params.action === "idea_generate") {
    return {
      actionName: "创意生成",
      actions: ["idea_generate"],
      limit: params.dailyIdeaGenerations,
    };
  }

  if (params.action === "idea_analyze") {
    return {
      actionName: "创意分析",
      actions: ["idea_analyze"],
      limit: params.dailyIdeaAnalyses,
    };
  }

  if (params.action === "chapter_generate" || params.action === "chapter_generate_stream") {
    return {
      actionName: "章节生成",
      actions: ["chapter_generate", "chapter_generate_stream"],
      limit: params.dailyChapterGenerations,
    };
  }

  if (params.action === "chapter_summary") {
    return {
      actionName: "章节摘要",
      actions: ["chapter_summary"],
      limit: params.dailyChapterSummaries,
    };
  }

  if (params.action === "chapter_outline") {
    return {
      actionName: "章节大纲",
      actions: ["chapter_outline"],
      limit: params.dailyChapterOutlines,
    };
  }

  if (params.action === "chapter_details") {
    return {
      actionName: "细节提取",
      actions: ["chapter_details"],
      limit: params.dailyChapterDetails,
    };
  }

  return null;
}

export async function assertCanCreateWork(user: MembershipGuardUser) {
  if (isAdminUser(user)) return;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  if (isUnlimitedMembershipLimit(limits.maxWorks)) return;

  const currentWorks = await prisma.work.count({
    where: {
      userId: user.id,
      deletedAt: null,
    },
  });

  assertMembershipCountAvailable({
    current: currentWorks,
    limit: limits.maxWorks,
    message: (limit) =>
      `${limits.label} 最多只能创建 ${limit} 部作品，请升级套餐后继续创建。`,
  });
}

export async function assertCanCreateChapter(
  user: MembershipGuardUser,
  workId: string,
  options?: { index?: number | null },
) {
  if (isAdminUser(user)) return;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  if (isUnlimitedMembershipLimit(limits.maxChaptersPerWork)) return;

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      userId: true,
      deletedAt: true,
    },
  });

  if (!work || work.deletedAt) {
    throw new AuthApiError(404, "作品不存在或已被删除。");
  }

  if (work.userId !== user.id) {
    throw new AuthApiError(403, "无权限访问该作品。");
  }

  if (typeof options?.index === "number") {
    const existingChapter = await prisma.chapter.findUnique({
      where: { workId_index: { workId, index: options.index } },
      select: { id: true, deletedAt: true },
    });

    if (existingChapter && !existingChapter.deletedAt) return;
  }

  const currentChapters = await prisma.chapter.count({
    where: {
      workId,
      deletedAt: null,
    },
  });

  assertMembershipCountAvailable({
    current: currentChapters,
    limit: limits.maxChaptersPerWork,
    message: (limit) =>
      `${limits.label} 单部作品最多只能创建 ${limit} 个章节/场景，请升级套餐后继续写作。`,
  });
}

export async function assertCanUseAiAction(
  user: MembershipGuardUser,
  action: string,
) {
  if (isAdminUser(user)) return;

  const limits = await getMembershipLimits(user.membershipTier ?? "default");
  const actionLimit = getAiActionLimit({
    action,
    dailyLongNovelOutlines: limits.dailyLongNovelOutlines,
    dailyShortStoryOutlines: limits.dailyShortStoryOutlines,
    dailyIdeaGenerations: limits.dailyIdeaGenerations,
    dailyIdeaAnalyses: limits.dailyIdeaAnalyses,
    dailyChapterGenerations: limits.dailyChapterGenerations,
    dailyChapterSummaries: limits.dailyChapterSummaries,
    dailyChapterOutlines: limits.dailyChapterOutlines,
    dailyChapterDetails: limits.dailyChapterDetails,
  });

  if (!actionLimit || isUnlimitedMembershipLimit(actionLimit.limit)) return;

  const { start, end } = getTodayRange();
  const now = new Date();
  const actionFilter: Prisma.StringFilter =
    actionLimit.actions.length === 1
      ? { equals: actionLimit.actions[0] }
      : { in: actionLimit.actions };

  const [usedCount, pendingReservationCount] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: {
        userId: user.id,
        action: actionFilter,
        success: true,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.aiQuotaReservation.count({
      where: {
        userId: user.id,
        action: actionFilter,
        status: "pending",
        createdAt: { gte: start, lt: end },
        expiresAt: { gt: now },
      },
    }),
  ]);

  if (usedCount + pendingReservationCount >= actionLimit.limit) {
    throw new AuthApiError(
      429,
      `${limits.label} 今日${actionLimit.actionName}次数已用完，请升级套餐或明天再试。`,
    );
  }
}

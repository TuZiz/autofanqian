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
import { AI_ACTIONS, getAiActionAliases, normalizeAiAction } from "@/shared/ai-actions";

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
  const normalizedAction = normalizeAiAction(params.action);
  if (
    normalizedAction === AI_ACTIONS.shortStoryGenerate ||
    params.action === "short_story_outline_generate_retry"
  ) {
    return {
      actionName: "短篇大纲",
      actions: getAiActionAliases(AI_ACTIONS.shortStoryGenerate),
      limit: params.dailyShortStoryOutlines,
    };
  }

  if (
    normalizedAction === AI_ACTIONS.outlineGenerate ||
    params.action === "outline_generate_retry" ||
    params.action === "outline_extend" ||
    params.action === "outline_extend_retry"
  ) {
    return {
      actionName: "长篇大纲",
      actions: getAiActionAliases(AI_ACTIONS.outlineGenerate),
      limit: params.dailyLongNovelOutlines,
    };
  }

  if (params.action === "idea_generate" || params.action === "idea_generate_expand") {
    return {
      actionName: "创意生成",
      actions: ["idea_generate", "idea_generate_expand"],
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

  if (
    normalizedAction === AI_ACTIONS.chapterGenerate ||
    params.action === "chapter_generate_stream" ||
    params.action === "chapter_generate_length_repair" ||
    params.action === "chapter_generate_stream_length_repair"
  ) {
    return {
      actionName: "章节生成",
      actions: getAiActionAliases(AI_ACTIONS.chapterGenerate),
      limit: params.dailyChapterGenerations,
    };
  }

  if (normalizedAction === AI_ACTIONS.chapterSummary) {
    return {
      actionName: "章节摘要",
      actions: getAiActionAliases(AI_ACTIONS.chapterSummary),
      limit: params.dailyChapterSummaries,
    };
  }

  if (normalizedAction === AI_ACTIONS.chapterOutline) {
    return {
      actionName: "章节大纲",
      actions: getAiActionAliases(AI_ACTIONS.chapterOutline),
      limit: params.dailyChapterOutlines,
    };
  }

  if (normalizedAction === AI_ACTIONS.chapterDetails) {
    return {
      actionName: "细节提取",
      actions: getAiActionAliases(AI_ACTIONS.chapterDetails),
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
        OR: [
          { status: "pending", expiresAt: { gt: now } },
          { status: "committed_failed" },
        ],
        createdAt: { gte: start, lt: end },
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

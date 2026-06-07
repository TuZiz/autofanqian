import "server-only";

import { Prisma } from "@prisma/client";

import { getAiUsagePeriodKeys } from "@/lib/ai/usage-counter";
import {
  assertCanManageTargetUser,
  getEffectiveUserRole,
  isRootAdminUser,
  isSuperAdminUser,
  normalizeStoredRole,
  type AdminLikeUser,
} from "@/lib/auth/admin";
import { AuthApiError } from "@/lib/auth/errors";
import { recordAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";
import type {
  AdminMembershipTierFilter,
  AdminUserDetailResponse,
  AdminUserListItem,
  AdminUserPatchInput,
  AdminUsersResponse,
  AdminUserRoleFilter,
  AdminUserSort,
  AdminUserStatusFilter,
  AdminEmailVerifiedFilter,
} from "@/lib/admin/admin-user-types";

const successStatuses = ["succeeded", "success"] as const;
const failedStatuses = ["failed"] as const;

type ListUsersParams = {
  cursor?: string;
  emailVerified: AdminEmailVerifiedFilter;
  membershipTier: AdminMembershipTierFilter;
  q?: string;
  role: AdminUserRoleFilter;
  sort: AdminUserSort;
  status: AdminUserStatusFilter;
  take: number;
};

export async function listAdminUsers(params: ListUsersParams): Promise<AdminUsersResponse> {
  const where = buildUsersWhere(params);
  const summaryWhere: Prisma.UserWhereInput = {};
  const todayStart = getLocalDayStart();
  const todayPeriodKey = getAiUsagePeriodKeys().daily;

  const orderBy = getOrderBy(params.sort);

  const [
    users,
    totalUsers,
    activeUsers,
    bannedUsers,
    limitedUsers,
    adminUsers,
    verifiedUsers,
    paidUsers,
    todayNewUsers,
  ] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      take: params.take + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        role: true,
        status: true,
        membershipTier: true,
        membershipExpiresAt: true,
        emailVerified: true,
        bannedReason: true,
        bannedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            generationJobs: true,
            works: true,
          },
        },
        aiUsageCounters: {
          where: {
            periodType: "daily",
            periodKey: todayPeriodKey,
          },
          select: {
            requestCount: true,
          },
        },
      },
    }),
    prisma.user.count({ where: summaryWhere }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "banned" } }),
    prisma.user.count({ where: { status: "limited" } }),
    prisma.user.count({ where: { role: { in: ["admin", "super_admin"] } } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { membershipTier: { not: "default" } } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  const visibleUsers = users.slice(0, params.take);
  const nextCursor = users.length > params.take ? users[params.take]?.id ?? null : null;

  return {
    nextCursor,
    summary: {
      totalUsers,
      activeUsers,
      bannedUsers,
      limitedUsers,
      adminUsers,
      verifiedUsers,
      paidUsers,
      todayNewUsers,
    },
    users: visibleUsers.map(serializeUserListItem),
  };
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetailResponse | null> {
  const todayPeriodKey = getAiUsagePeriodKeys().daily;

  const [
    user,
    longWorks,
    shortWorks,
    successfulGenerationJobs,
    failedGenerationJobs,
    todayCounters,
    totalUsage,
    recentGenerationJobs,
    recentLoginAttempts,
    recentWorks,
    activeSessions,
  ] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        email: true,
        name: true,
        role: true,
        status: true,
        membershipTier: true,
        membershipExpiresAt: true,
        emailVerified: true,
        bannedReason: true,
        bannedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            generationJobs: true,
            works: true,
          },
        },
      },
    }),
    prisma.work.count({ where: { userId: id, workType: "long_novel", deletedAt: null } }),
    prisma.work.count({ where: { userId: id, workType: "short_story", deletedAt: null } }),
    prisma.generationJob.count({ where: { userId: id, status: { in: [...successStatuses] } } }),
    prisma.generationJob.count({ where: { userId: id, status: { in: [...failedStatuses] } } }),
    prisma.aiUsageCounter.findMany({
      where: {
        userId: id,
        periodType: "daily",
        periodKey: todayPeriodKey,
      },
      select: {
        requestCount: true,
        tokenCount: true,
      },
    }),
    prisma.aiUsageEvent.aggregate({
      where: { userId: id },
      _count: { _all: true },
      _sum: { totalTokens: true },
    }),
    prisma.generationJob.findMany({
      where: { userId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        action: true,
        jobType: true,
        status: true,
        errorMessage: true,
        totalTokens: true,
        durationMs: true,
        createdAt: true,
        novel: { select: { id: true, title: true } },
      },
    }),
    prisma.loginAttempt.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        success: true,
        failureReason: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.work.findMany({
      where: { userId: id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        workType: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.userSession.count({
      where: {
        userId: id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  if (!user) return null;

  const listItem = serializeUserListItem({
    ...user,
    aiUsageCounters: todayCounters.map((counter) => ({
      requestCount: counter.requestCount,
    })),
  });
  const todayAiCalls = todayCounters.reduce((total, counter) => total + counter.requestCount, 0);
  const todayTokens = todayCounters.reduce((total, counter) => total + counter.tokenCount, 0);

  return {
    user: {
      id: listItem.id,
      code: listItem.code,
      email: listItem.email,
      name: listItem.name,
      role: listItem.role,
      status: listItem.status,
      membershipTier: listItem.membershipTier,
      membershipExpiresAt: listItem.membershipExpiresAt,
      emailVerified: listItem.emailVerified,
      bannedReason: listItem.bannedReason,
      bannedAt: listItem.bannedAt,
      lastLoginAt: listItem.lastLoginAt,
      createdAt: listItem.createdAt,
      updatedAt: listItem.updatedAt,
      isRootAdmin: listItem.isRootAdmin,
    },
    stats: {
      works: user._count.works,
      longWorks,
      shortWorks,
      generationJobs: user._count.generationJobs,
      successfulGenerationJobs,
      failedGenerationJobs,
      todayAiCalls,
      todayTokens,
      totalAiCalls: totalUsage._count._all,
      totalTokens: totalUsage._sum.totalTokens ?? 0,
      activeSessions,
    },
    recentGenerationJobs: recentGenerationJobs.map((job) => ({
      id: job.id,
      action: job.action,
      jobType: job.jobType,
      status: job.status,
      errorMessage: job.errorMessage,
      totalTokens: job.totalTokens,
      durationMs: job.durationMs,
      createdAt: job.createdAt.toISOString(),
      novel: job.novel ? { id: job.novel.id, title: job.novel.title } : null,
    })),
    recentLoginAttempts: recentLoginAttempts.map((attempt) => ({
      id: attempt.id,
      success: attempt.success,
      failureReason: attempt.failureReason,
      ip: attempt.ip,
      userAgent: attempt.userAgent,
      createdAt: attempt.createdAt.toISOString(),
    })),
    recentWorks: recentWorks.map((work) => ({
      id: work.id,
      title: work.title,
      workType: work.workType,
      updatedAt: work.updatedAt.toISOString(),
      createdAt: work.createdAt.toISOString(),
    })),
  };
}

export async function updateAdminUser(
  request: Request,
  adminUser: AdminLikeUser,
  id: string,
  input: AdminUserPatchInput,
) {
  const before = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      email: true,
      name: true,
      role: true,
      status: true,
      membershipTier: true,
      membershipExpiresAt: true,
      emailVerified: true,
      bannedReason: true,
      bannedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!before) {
    throw new AuthApiError(404, "用户不存在。");
  }

  const adminCanPromoteAdmin = isRootAdminUser(adminUser) || isSuperAdminUser(adminUser);
  const requestedRole = input.role;
  const nextRole = requestedRole
    ? normalizeStoredRole({ email: before.email, requestedRole })
    : before.role;
  const roleChange = requestedRole !== undefined && nextRole !== before.role;
  const membershipChange =
    input.membershipTier !== undefined ||
    input.membershipExpiresAt !== undefined;

  assertCanManageTargetUser({
    adminUser,
    targetUser: before,
    action: roleChange ? "role_change" : membershipChange ? "membership_change" : "update",
  });

  if (roleChange && !adminCanPromoteAdmin) {
    throw new AuthApiError(403, "只有 root admin 或 super_admin 可以调整管理员角色。");
  }

  if (requestedRole === "admin" && !adminCanPromoteAdmin) {
    throw new AuthApiError(403, "只有 root admin 或 super_admin 可以设置管理员。");
  }

  if (isRootAdminUser(before)) {
    if (input.status && input.status !== "active") {
      throw new AuthApiError(400, "root admin 账号不能被封禁、限制或删除态。");
    }
    if (requestedRole && nextRole !== "super_admin") {
      throw new AuthApiError(400, "root admin 角色由环境变量决定，不能在后台降权。");
    }
  }

  if (input.status === "banned" && !input.bannedReason?.trim()) {
    throw new AuthApiError(400, "封禁用户时必须填写封禁原因。");
  }

  const nextStatus = input.status ?? before.status;
  const nextBannedReason =
    input.bannedReason !== undefined
      ? normalizeNullableText(input.bannedReason, 500)
      : nextStatus === "banned"
        ? before.bannedReason
        : null;
  const nextBannedAt = getNextBannedAt(input.status, before.bannedAt);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: input.name !== undefined ? normalizeNullableText(input.name, 64) : undefined,
      status: input.status,
      bannedReason: nextBannedReason,
      bannedAt: nextBannedAt,
      role: requestedRole ? nextRole : undefined,
      membershipTier: input.membershipTier,
      membershipExpiresAt:
        input.membershipExpiresAt !== undefined
          ? parseNullableDate(input.membershipExpiresAt)
          : undefined,
      emailVerified: input.emailVerified,
    },
    select: {
      id: true,
    },
  });

  await recordAdminAuditLog({
    request,
    adminUser: {
      id: adminUser.id ?? "",
      email: adminUser.email,
    },
    action: "user.lite_update",
    targetType: "User",
    targetId: updated.id,
    before,
    after: input,
  });

  return getAdminUserDetail(id);
}

type UserListRow = {
  id: string;
  code: number;
  email: string;
  name: string | null;
  role: "user" | "admin" | "super_admin";
  status: "active" | "banned" | "limited" | "deleted";
  membershipTier: "default" | "plus" | "pro" | "max";
  membershipExpiresAt: Date | null;
  emailVerified: boolean;
  bannedReason: string | null;
  bannedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    generationJobs: number;
    works: number;
  };
  aiUsageCounters: Array<{
    requestCount: number;
  }>;
};

function serializeUserListItem(row: UserListRow): AdminUserListItem {
  return {
    id: row.id,
    code: row.code,
    email: row.email,
    name: row.name,
    role: getEffectiveUserRole(row),
    status: row.status,
    membershipTier: row.membershipTier,
    membershipExpiresAt: row.membershipExpiresAt?.toISOString() ?? null,
    emailVerified: row.emailVerified,
    bannedReason: row.bannedReason,
    bannedAt: row.bannedAt?.toISOString() ?? null,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isRootAdmin: isRootAdminUser(row),
    stats: {
      works: row._count.works,
      generationJobs: row._count.generationJobs,
      todayAiCalls: row.aiUsageCounters.reduce((total, counter) => total + counter.requestCount, 0),
    },
  };
}

function buildUsersWhere(params: ListUsersParams): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];
  const trimmed = params.q?.trim();

  if (trimmed) {
    const or: Prisma.UserWhereInput[] = [
      { email: { contains: trimmed, mode: "insensitive" } },
      { name: { contains: trimmed, mode: "insensitive" } },
    ];

    if (/^\d+$/.test(trimmed)) {
      const code = Number(trimmed);
      if (Number.isSafeInteger(code)) {
        or.push({ code });
      }
    }

    and.push({ OR: or });
  }

  if (params.role !== "all") {
    and.push({ role: params.role });
  }

  if (params.status !== "all") {
    and.push({ status: params.status });
  }

  if (params.membershipTier !== "all") {
    and.push({ membershipTier: params.membershipTier });
  }

  if (params.emailVerified === "verified") {
    and.push({ emailVerified: true });
  }

  if (params.emailVerified === "unverified") {
    and.push({ emailVerified: false });
  }

  return and.length ? { AND: and } : {};
}

function getOrderBy(sort: AdminUserSort): Prisma.UserOrderByWithRelationInput[] {
  if (sort === "lastLoginAt_desc") return [{ lastLoginAt: "desc" }, { createdAt: "desc" }];
  if (sort === "updatedAt_desc") return [{ updatedAt: "desc" }, { id: "desc" }];
  if (sort === "generationJobs_desc") return [{ generationJobs: { _count: "desc" } }, { createdAt: "desc" }];
  if (sort === "works_desc") return [{ works: { _count: "desc" } }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }, { id: "desc" }];
}

function normalizeNullableText(value: string | null | undefined, maxLength: number) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function parseNullableDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AuthApiError(400, "会员到期时间格式不正确。");
  }
  return date;
}

function getNextBannedAt(status: AdminUserPatchInput["status"], current: Date | null) {
  if (status === undefined) return undefined;
  if (status === "banned") return current ?? new Date();
  return null;
}

function getLocalDayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

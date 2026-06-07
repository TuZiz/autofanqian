export const adminUserRoles = ["user", "admin", "super_admin"] as const;
export const adminEditableUserRoles = ["user", "admin"] as const;
export const adminUserStatuses = ["active", "banned", "limited", "deleted"] as const;
export const adminMembershipTiers = ["default", "plus", "pro", "max"] as const;

export const adminUserRoleFilters = ["all", ...adminUserRoles] as const;
export const adminUserStatusFilters = ["all", ...adminUserStatuses] as const;
export const adminMembershipTierFilters = ["all", ...adminMembershipTiers] as const;
export const adminEmailVerifiedFilters = ["all", "verified", "unverified"] as const;
export const adminUserSorts = [
  "createdAt_desc",
  "lastLoginAt_desc",
  "updatedAt_desc",
  "generationJobs_desc",
  "works_desc",
] as const;

export type AdminUserRole = (typeof adminUserRoles)[number];
export type AdminEditableUserRole = (typeof adminEditableUserRoles)[number];
export type AdminUserStatus = (typeof adminUserStatuses)[number];
export type AdminMembershipTier = (typeof adminMembershipTiers)[number];
export type AdminUserRoleFilter = (typeof adminUserRoleFilters)[number];
export type AdminUserStatusFilter = (typeof adminUserStatusFilters)[number];
export type AdminMembershipTierFilter = (typeof adminMembershipTierFilters)[number];
export type AdminEmailVerifiedFilter = (typeof adminEmailVerifiedFilters)[number];
export type AdminUserSort = (typeof adminUserSorts)[number];

export type AdminUserListItem = {
  id: string;
  code: number;
  email: string;
  name: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  membershipTier: AdminMembershipTier;
  membershipExpiresAt: string | null;
  emailVerified: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRootAdmin: boolean;
  stats: {
    works: number;
    generationJobs: number;
    todayAiCalls: number;
  };
};

export type AdminUsersResponse = {
  nextCursor: string | null;
  summary: {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    limitedUsers: number;
    adminUsers: number;
    verifiedUsers: number;
    paidUsers: number;
    todayNewUsers: number;
  };
  users: AdminUserListItem[];
};

export type AdminUserDetail = Omit<AdminUserListItem, "stats">;

export type AdminUserStats = {
  works: number;
  longWorks: number;
  shortWorks: number;
  generationJobs: number;
  successfulGenerationJobs: number;
  failedGenerationJobs: number;
  todayAiCalls: number;
  todayTokens: number;
  totalAiCalls: number;
  totalTokens: number;
  activeSessions: number;
};

export type AdminUserRecentGenerationJob = {
  id: string;
  action: string;
  jobType: string | null;
  status: string;
  errorMessage: string | null;
  totalTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  novel: {
    id: string;
    title: string;
  } | null;
};

export type AdminUserRecentLoginAttempt = {
  id: string;
  success: boolean;
  failureReason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminUserRecentWork = {
  id: string;
  title: string;
  workType: string;
  updatedAt: string;
  createdAt: string;
};

export type AdminUserDetailResponse = {
  recentGenerationJobs: AdminUserRecentGenerationJob[];
  recentLoginAttempts: AdminUserRecentLoginAttempt[];
  recentWorks: AdminUserRecentWork[];
  stats: AdminUserStats;
  user: AdminUserDetail;
};

export type AdminUserPatchInput = {
  name?: string | null;
  status?: AdminUserStatus;
  bannedReason?: string | null;
  role?: AdminEditableUserRole;
  membershipTier?: AdminMembershipTier;
  membershipExpiresAt?: string | null;
  emailVerified?: boolean;
};

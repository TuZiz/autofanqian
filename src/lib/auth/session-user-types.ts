import type { MembershipTierValue } from "@/lib/auth/user-groups";

export type SessionAccessRole = "user" | "admin" | "super_admin";

export type SessionAccessFields = {
  membershipTier?: MembershipTierValue;
  role?: SessionAccessRole;
  displayGroup?: string;
  isAdmin?: boolean;
  isRootAdmin?: boolean;
};

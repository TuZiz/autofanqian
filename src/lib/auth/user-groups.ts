export const membershipTierValues = ["default", "plus", "pro", "max"] as const;

export type MembershipTierValue = (typeof membershipTierValues)[number];

export const membershipTierLabels: Record<MembershipTierValue, string> = {
  default: "Free",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
};

export function isMembershipTier(value: string | null | undefined): value is MembershipTierValue {
  return membershipTierValues.includes((value ?? "") as MembershipTierValue);
}

export function getMembershipTierLabel(value: string | null | undefined) {
  if (!isMembershipTier(value)) return membershipTierLabels.default;
  return membershipTierLabels[value];
}

export function getDisplayGroup(user: {
  membershipTier?: string | null;
  role?: string | null;
}) {
  if (user.role === "admin" || user.role === "super_admin") {
    return "管理员";
  }

  return getMembershipTierLabel(user.membershipTier);
}

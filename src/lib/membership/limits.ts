import "server-only";

import { z } from "zod";

import {
  isMembershipTier,
  membershipTierLabels,
  membershipTierValues,
  type MembershipTierValue,
} from "@/lib/auth/user-groups";
import { prisma } from "@/lib/prisma";

export const MEMBERSHIP_LIMITS_CONFIG_KEY = "membership_limits";

export type MembershipTierLimits = {
  tier: MembershipTierValue;
  label: string;
  dailyAiCalls: number;
  dailyTokens: number;
  minuteAiCalls: number;
  maxWorks: number;
  maxChaptersPerWork: number;
  dailyShortStoryOutlines: number;
  dailyLongNovelOutlines: number;
};

export const DEFAULT_MEMBERSHIP_LIMITS: Record<MembershipTierValue, MembershipTierLimits> = {
  default: {
    tier: "default",
    label: membershipTierLabels.default,
    dailyAiCalls: 10,
    dailyTokens: 30_000,
    minuteAiCalls: 1,
    maxWorks: 3,
    maxChaptersPerWork: 20,
    dailyShortStoryOutlines: 3,
    dailyLongNovelOutlines: 1,
  },
  plus: {
    tier: "plus",
    label: membershipTierLabels.plus,
    dailyAiCalls: 100,
    dailyTokens: 500_000,
    minuteAiCalls: 3,
    maxWorks: 20,
    maxChaptersPerWork: 200,
    dailyShortStoryOutlines: 30,
    dailyLongNovelOutlines: 10,
  },
  pro: {
    tier: "pro",
    label: membershipTierLabels.pro,
    dailyAiCalls: 500,
    dailyTokens: 2_000_000,
    minuteAiCalls: 8,
    maxWorks: 100,
    maxChaptersPerWork: 1_000,
    dailyShortStoryOutlines: 150,
    dailyLongNovelOutlines: 50,
  },
  max: {
    tier: "max",
    label: membershipTierLabels.max,
    dailyAiCalls: 3_000,
    dailyTokens: 10_000_000,
    minuteAiCalls: 20,
    maxWorks: -1,
    maxChaptersPerWork: -1,
    dailyShortStoryOutlines: 1_000,
    dailyLongNovelOutlines: 300,
  },
};

const limitValueSchema = z.coerce.number().int().min(-1).max(100_000_000);
const tierLimitOverrideSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  dailyAiCalls: limitValueSchema.optional(),
  dailyTokens: limitValueSchema.optional(),
  minuteAiCalls: limitValueSchema.optional(),
  maxWorks: limitValueSchema.optional(),
  maxChaptersPerWork: limitValueSchema.optional(),
  dailyShortStoryOutlines: limitValueSchema.optional(),
  dailyLongNovelOutlines: limitValueSchema.optional(),
});

const tierOverridesSchema = z.object({
  default: tierLimitOverrideSchema.optional(),
  plus: tierLimitOverrideSchema.optional(),
  pro: tierLimitOverrideSchema.optional(),
  max: tierLimitOverrideSchema.optional(),
});

const appConfigSchema = z.union([
  z.object({
    version: z.literal(1).optional(),
    tiers: tierOverridesSchema.partial().optional(),
  }),
  tierOverridesSchema.partial(),
]);

type TierLimitOverride = z.infer<typeof tierLimitOverrideSchema>;

function normalizeTier(value: string | null | undefined): MembershipTierValue {
  return isMembershipTier(value) ? value : "default";
}

function cloneLimits(limits: MembershipTierLimits): MembershipTierLimits {
  return { ...limits };
}

function applyOverride(
  limits: MembershipTierLimits,
  override: TierLimitOverride | undefined,
): MembershipTierLimits {
  if (!override) return cloneLimits(limits);

  return {
    ...limits,
    label: override.label?.trim() || limits.label,
    dailyAiCalls: override.dailyAiCalls ?? limits.dailyAiCalls,
    dailyTokens: override.dailyTokens ?? limits.dailyTokens,
    minuteAiCalls: override.minuteAiCalls ?? limits.minuteAiCalls,
    maxWorks: override.maxWorks ?? limits.maxWorks,
    maxChaptersPerWork: override.maxChaptersPerWork ?? limits.maxChaptersPerWork,
    dailyShortStoryOutlines:
      override.dailyShortStoryOutlines ?? limits.dailyShortStoryOutlines,
    dailyLongNovelOutlines:
      override.dailyLongNovelOutlines ?? limits.dailyLongNovelOutlines,
  };
}

function getOverridesByTier(
  parsed: z.infer<typeof appConfigSchema>,
): Partial<Record<MembershipTierValue, TierLimitOverride>> {
  if (Object.prototype.hasOwnProperty.call(parsed, "tiers")) {
    const config = parsed as { tiers?: Partial<Record<MembershipTierValue, TierLimitOverride>> };
    return config.tiers ?? {};
  }

  return parsed as Partial<Record<MembershipTierValue, TierLimitOverride>>;
}

export function getDefaultMembershipLimits(
  tier: string | null | undefined,
): MembershipTierLimits {
  return cloneLimits(DEFAULT_MEMBERSHIP_LIMITS[normalizeTier(tier)]);
}

export async function getMembershipLimits(
  tier: string | null | undefined,
): Promise<MembershipTierLimits> {
  const normalizedTier = normalizeTier(tier);
  const defaults = DEFAULT_MEMBERSHIP_LIMITS[normalizedTier];

  try {
    const existing = await prisma.appConfig.findUnique({
      where: { key: MEMBERSHIP_LIMITS_CONFIG_KEY },
      select: { value: true },
    });

    if (!existing) return cloneLimits(defaults);

    const parsed = appConfigSchema.safeParse(existing.value);
    if (!parsed.success) return cloneLimits(defaults);

    const overrides = getOverridesByTier(parsed.data);
    return applyOverride(defaults, overrides[normalizedTier]);
  } catch (error) {
    console.warn("Failed to read membership limits config:", error);
    return cloneLimits(defaults);
  }
}

export function getAllDefaultMembershipLimits() {
  return membershipTierValues.map((tier) => cloneLimits(DEFAULT_MEMBERSHIP_LIMITS[tier]));
}

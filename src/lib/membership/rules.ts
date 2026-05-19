import { AuthApiError } from "@/lib/auth/errors";
import type { MembershipTierLimits } from "@/lib/membership/limits";

export type MembershipAiUsageSnapshot = {
  activeJobs: number;
  dailyCalls: number;
  dailyTokens: number;
  dailyGeneratedChars: number;
  monthlyGeneratedChars: number;
  minuteCalls: number;
};

export function isUnlimitedMembershipLimit(limit: number) {
  return limit < 0;
}

export function assertMembershipAiUsageAvailable(
  limits: MembershipTierLimits,
  usage: MembershipAiUsageSnapshot,
) {
  if (
    !isUnlimitedMembershipLimit(limits.minuteAiCalls) &&
    usage.minuteCalls + usage.activeJobs >= limits.minuteAiCalls
  ) {
    throw new AuthApiError(
      429,
      `${limits.label} 每分钟 AI 调用次数已达上限，请稍后再试。`,
    );
  }

  if (
    !isUnlimitedMembershipLimit(limits.dailyAiCalls) &&
    usage.dailyCalls >= limits.dailyAiCalls
  ) {
    throw new AuthApiError(
      429,
      `${limits.label} 今日 AI 调用次数已用完，请升级套餐或明天再试。`,
    );
  }

  if (
    !isUnlimitedMembershipLimit(limits.dailyTokens) &&
    usage.dailyTokens >= limits.dailyTokens
  ) {
    throw new AuthApiError(
      429,
      `${limits.label} 今日 AI token 配额已用完，请升级套餐或明天再试。`,
    );
  }

  if (
    !isUnlimitedMembershipLimit(limits.dailyGeneratedChars) &&
    usage.dailyGeneratedChars >= limits.dailyGeneratedChars
  ) {
    throw new AuthApiError(
      429,
      `${limits.label} 今日可生成字数已用完，请升级套餐或明天再试。`,
    );
  }

  if (
    !isUnlimitedMembershipLimit(limits.monthlyGeneratedChars) &&
    usage.monthlyGeneratedChars >= limits.monthlyGeneratedChars
  ) {
    throw new AuthApiError(
      429,
      `${limits.label} 本月可生成字数已用完，请升级套餐后继续写作。`,
    );
  }
}

export function assertMembershipCountAvailable(params: {
  current: number;
  limit: number;
  message: (limit: number) => string;
}) {
  if (isUnlimitedMembershipLimit(params.limit)) return;
  if (params.current < params.limit) return;
  throw new AuthApiError(429, params.message(params.limit));
}

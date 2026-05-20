import "server-only";

import { isAdminUser } from "@/lib/auth/admin";

type ChapterAuxiliaryUser = {
  email: string;
  role?: string | null;
  membershipTier?: string | null;
};

export type ChapterAuxiliaryFlags = {
  chapterPlan: boolean;
  consistencyCheck: boolean;
  consistencyRepair: boolean;
  qualityCheck: boolean;
};

function readBooleanEnv(key: string): boolean | null {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return null;
}

function envOrDefault(key: string, fallback: boolean) {
  return readBooleanEnv(key) ?? fallback;
}

export function getChapterAuxiliaryFlags(
  user?: ChapterAuxiliaryUser | null,
): ChapterAuxiliaryFlags {
  const isAdmin = isAdminUser(user);
  const tier = user?.membershipTier ?? "default";
  const qualityDefault = isAdmin || tier === "plus" || tier === "pro" || tier === "max";

  return {
    chapterPlan: envOrDefault("AI_ENABLE_CHAPTER_PLAN", true),
    consistencyCheck: envOrDefault("AI_ENABLE_CONSISTENCY_CHECK", true),
    consistencyRepair: envOrDefault("AI_ENABLE_CONSISTENCY_REPAIR", true),
    qualityCheck: envOrDefault("AI_ENABLE_QUALITY_CHECK", qualityDefault),
  };
}

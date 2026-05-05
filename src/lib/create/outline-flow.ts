import type { SessionAccessFields } from "@/lib/auth/session-user-types";
import { aiZhCN, getAiOutlineStageTitle } from "@/lib/copy/ai-zh-cn";

export type OutlineSessionUser = SessionAccessFields & {
  email: string;
};

export type OutlineStage = "outline" | "work" | "done" | "error";

export const AI_THINKING_COPY = aiZhCN.outline.thinking;
export const DOTS = ["", ".", "..", "..."] as const;

export function safeJsonParse<T>(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getOutlineStageTitle(stage: OutlineStage) {
  return getAiOutlineStageTitle(stage);
}

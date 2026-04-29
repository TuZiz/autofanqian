export type OutlineSessionUser = {
  email: string;
  isAdmin?: boolean;
};

export type OutlineStage = "outline" | "work" | "done" | "error";

export const AI_THINKING_COPY = ["AI 思考中...", "正在组织结构...", "文本较长，请稍候..."] as const;
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
  if (stage === "work") return "正在创建作品";
  if (stage === "done") return "即将进入作品页";
  if (stage === "error") return "生成失败";
  return "正在生成小说大纲";
}

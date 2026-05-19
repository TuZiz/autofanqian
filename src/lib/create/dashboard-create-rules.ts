import type { CreateUiConfig } from "./dashboard-create-types";

export type CreateFormErrorTarget = "genre" | "idea" | "ai" | "options" | "storage";

export const MIN_IDEA_LENGTH_FOR_AI = 10;
export const MIN_IDEA_LENGTH_FOR_OUTLINE = 50;
export const MIN_CUSTOM_GENRE_NAME = 2;
export const MIN_CUSTOM_TAG_COUNT = 2;
export const MIN_CUSTOM_DETAIL_LENGTH = 6;
export const TEMPLATE_SHOWCASE_LIMIT = 6;
export const EMPTY_GENRES: CreateUiConfig["genres"] = [];
export const EMPTY_OPTIONS: CreateUiConfig["platforms"] = [];

export function shuffleItems<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function summarizeTemplatePreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").replace(/^[【\[]?[^\n:：]{0,20}[\]】]?[:：]\s*/, "").trim();
  if (!normalized) {
    return "模板摘要生成中";
  }
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized;
}

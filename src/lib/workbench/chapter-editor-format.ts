import { extractChapterDraftFromText } from "@/lib/ai/chapter-draft";

import type { ChapterDetail } from "./chapter-editor-types";

export function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

export function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeDetailLines(raw: string) {
  return (raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*\\-]+/, "").trim().slice(0, 400))
    .filter(Boolean)
    .slice(0, 200);
}

export function splitPreviewLines(raw: string, limit = 4) {
  return (raw ?? "")
    .split(/\r?\n|[;；.。]/)
    .map((line) => line.replace(/^[\s*\\-]+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function formatChineseVolumeOrdinal(index: number) {
  const numerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (index >= 1 && index <= numerals.length) return numerals[index - 1];
  return String(index);
}

export function normalizeChapterDraft(chapter: ChapterDetail) {
  const rawContent = chapter.content ?? "";
  const trimmed = rawContent.trim();
  const looksJsonish =
    trimmed.includes("\"content\"") && trimmed.includes("{") && trimmed.includes("}");
  const extracted = looksJsonish ? extractChapterDraftFromText(rawContent) : null;

  return {
    title: extracted?.title ?? chapter.title ?? "",
    content: extracted?.content ?? rawContent,
  };
}

export function toChapterListItem(chapter: ChapterDetail) {
  return {
    id: chapter.id,
    index: chapter.index,
    title: chapter.title,
    wordCount: chapter.wordCount,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
  };
}

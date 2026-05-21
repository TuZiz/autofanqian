import "server-only";

import type { WorkExportPreview, WorkExportScope } from "@/shared/schemas/work-export";
import { WORK_EXPORT_AVAILABLE_FORMATS } from "@/shared/schemas/work-export";

export type ExportChapter = {
  index: number;
  title: string | null;
  content: string;
  wordCount?: number | null;
};

export type ExportWork = {
  title: string;
  synopsis: string;
  workType: string;
  chapters: ExportChapter[];
};

export function sanitizeExportFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) || "novel";
}

export function formatExportDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function getExportChapterHeading(workType: string, index: number, title: string | null) {
  const prefix = workType === "short_story" ? `场景 ${index}` : `第 ${index} 章`;
  return `${prefix} ${title || ""}`.trim();
}

export function getExportScopeLabel(scope: WorkExportScope, workType: string, chapterIndex?: number) {
  if (scope === "chapter") return `第${chapterIndex}章`;
  if (workType === "short_story" || scope === "short_story") return "短篇";
  return "全书";
}

export function buildTxtExport(work: ExportWork) {
  return [
    work.title,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      getExportChapterHeading(work.workType, chapter.index, chapter.title),
      "",
      chapter.content,
      "",
    ]),
  ].join("\n");
}

export function buildMarkdownExport(work: ExportWork) {
  return [
    `# ${work.title}`,
    "",
    work.synopsis,
    "",
    ...work.chapters.flatMap((chapter) => [
      `## ${getExportChapterHeading(work.workType, chapter.index, chapter.title)}`,
      "",
      chapter.content,
      "",
    ]),
  ].join("\n");
}

export function inspectExportChapters(
  chapters: ExportChapter[],
  scope: WorkExportScope,
): WorkExportPreview {
  const emptyChapters = chapters
    .filter((chapter) => !chapter.content.trim())
    .map((chapter) => chapter.index);
  const missingIndexes: number[] = [];

  if (scope !== "chapter" && chapters.length > 1) {
    const indexes = chapters.map((chapter) => chapter.index).sort((a, b) => a - b);
    for (let index = indexes[0]; index <= indexes[indexes.length - 1]; index += 1) {
      if (!indexes.includes(index)) missingIndexes.push(index);
    }
  }

  const warnings: string[] = [];
  if (!chapters.length) {
    warnings.push("没有可导出的章节。");
  }
  if (emptyChapters.length) {
    warnings.push(`存在空章节/场景：${emptyChapters.join("、")}。`);
  }
  if (missingIndexes.length) {
    warnings.push(
      `章节序号存在断裂：缺少 ${missingIndexes.slice(0, 20).join("、")}${missingIndexes.length > 20 ? " 等" : ""}。`,
    );
  }

  return {
    chapterCount: chapters.length,
    totalWordCount: chapters.reduce((sum, chapter) => {
      const fallback = chapter.content.replace(/\s+/g, "").length;
      return sum + (typeof chapter.wordCount === "number" ? chapter.wordCount : fallback);
    }, 0),
    emptyChapters,
    missingIndexes,
    warnings,
    availableFormats: [...WORK_EXPORT_AVAILABLE_FORMATS],
  };
}

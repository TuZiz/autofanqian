import type { WorkTypeValue } from "@/shared/work-type";

export type ImportedChapter = {
  index: number;
  title: string;
  content: string;
  wordCount: number;
};

export type ImportedNovelParseInput = {
  rawText: string;
  workType: WorkTypeValue;
};

export type ImportedNovelParseResult = {
  chapters: ImportedChapter[];
  totalWords: number;
  warnings: string[];
};

type DetectedHeading = {
  number: number;
  title: string;
};

type DraftChapter = {
  sourceNumber: number;
  title: string;
  lines: string[];
};

const CHINESE_NUMERAL_MAP: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function countWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function normalizeText(rawText: string) {
  return rawText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .trim();
}

function cleanContent(lines: string[]) {
  const output: string[] = [];
  let blankCount = 0;

  for (const line of lines) {
    const cleaned = line.replace(/[ \u3000]+$/g, "").trim();
    if (!cleaned) {
      blankCount += 1;
      if (output.length && blankCount <= 1) output.push("");
      continue;
    }
    blankCount = 0;
    output.push(cleaned);
  }

  while (output[0] === "") output.shift();
  while (output[output.length - 1] === "") output.pop();
  return output.join("\n").trim();
}

function parseChineseNumber(value: string) {
  const normalized = value.replace(/\s+/g, "");
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  if (!normalized) return 0;

  let result = 0;
  let section = 0;
  let current = 0;

  for (const char of normalized) {
    const digit = CHINESE_NUMERAL_MAP[char];
    if (typeof digit === "number") {
      current = digit;
      continue;
    }

    if (char === "十") {
      section += (current || 1) * 10;
      current = 0;
      continue;
    }
    if (char === "百") {
      section += (current || 1) * 100;
      current = 0;
      continue;
    }
    if (char === "千") {
      section += (current || 1) * 1000;
      current = 0;
    }
  }

  result += section + current;
  return result;
}

function stripMarkdownHeading(line: string) {
  return line.trim().replace(/^#{1,6}\s+/, "").trim();
}

function detectHeading(line: string): DetectedHeading | null {
  const value = stripMarkdownHeading(line);
  const cnMatch = value.match(
    /^第\s*([0-9零〇一二两三四五六七八九十百千]+)\s*[章节回卷部集篇]\s*[:：、.\-\s]*(.*)$/i,
  );
  if (cnMatch) {
    const number = parseChineseNumber(cnMatch[1] ?? "");
    if (number > 0) {
      return {
        number,
        title: (cnMatch[2] ?? "").trim(),
      };
    }
  }

  const enMatch = value.match(/^chapter\s+(\d+)\b\s*[:：、.\-\s]*(.*)$/i);
  if (enMatch) {
    const number = Number.parseInt(enMatch[1] ?? "", 10);
    if (number > 0) {
      return {
        number,
        title: (enMatch[2] ?? "").trim(),
      };
    }
  }

  return null;
}

function toDefaultTitle(index: number) {
  return `第 ${index} 章`;
}

function buildFallbackChapter(rawText: string) {
  const content = cleanContent(rawText.split("\n"));
  return {
    index: 1,
    title: toDefaultTitle(1),
    content,
    wordCount: countWords(content),
  };
}

function collectNumberWarnings(chapters: DraftChapter[]) {
  const warnings: string[] = [];
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const chapter of chapters) {
    if (seen.has(chapter.sourceNumber)) duplicates.add(chapter.sourceNumber);
    seen.add(chapter.sourceNumber);
  }

  if (duplicates.size) {
    warnings.push(
      `识别到重复章节序号：${Array.from(duplicates).sort((a, b) => a - b).join("、")}，已按出现顺序重排。`,
    );
  }

  const sorted = Array.from(seen).sort((a, b) => a - b);
  const missing: number[] = [];
  for (let index = sorted[0] ?? 1; index <= (sorted[sorted.length - 1] ?? 1); index += 1) {
    if (!seen.has(index)) missing.push(index);
  }

  if (missing.length) {
    warnings.push(`识别到章节跳号：缺少第 ${missing.slice(0, 12).join("、")} 章。`);
  }

  return warnings;
}

export function parseImportedNovelText(
  input: ImportedNovelParseInput,
): ImportedNovelParseResult {
  const rawText = normalizeText(input.rawText);
  const warnings: string[] = [];

  if (!rawText) {
    return { chapters: [], totalWords: 0, warnings: ["导入文本为空。"] };
  }

  const lines = rawText.split("\n");
  const drafts: DraftChapter[] = [];
  const prefaceLines: string[] = [];
  let current: DraftChapter | null = null;

  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      if (current) drafts.push(current);
      current = {
        sourceNumber: heading.number,
        title: heading.title,
        lines: [],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      prefaceLines.push(line);
    }
  }

  if (current) drafts.push(current);

  if (!drafts.length) {
    if (input.workType === "long_novel") {
      warnings.push("未识别到章节标题，可确认后作为单章长篇导入。");
    }
    const fallback = buildFallbackChapter(rawText);
    return {
      chapters: fallback.content ? [fallback] : [],
      totalWords: fallback.wordCount,
      warnings,
    };
  }

  if (cleanContent(prefaceLines)) {
    drafts[0]?.lines.unshift(...prefaceLines, "");
    warnings.push("章节标题前的正文已并入第 1 个识别章节。");
  }

  warnings.push(...collectNumberWarnings(drafts));

  const chapters = drafts
    .map((chapter, index) => {
      const content = cleanContent(chapter.lines);
      const normalizedIndex = index + 1;
      return {
        index: normalizedIndex,
        title: chapter.title || toDefaultTitle(normalizedIndex),
        content,
        wordCount: countWords(content),
      };
    })
    .filter((chapter) => chapter.content.trim());
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);

  return { chapters, totalWords, warnings };
}

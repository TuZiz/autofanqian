import type { StoryOutline, StoryOutlineRole } from "@/lib/create/outline-draft";

import type { ChapterListItem, VolumeSegment } from "./work-dashboard-types";

type OutlineVolume = StoryOutline["volumes"][number];

export function roleToDisplay(role: StoryOutlineRole) {
  const normalized = String(role).trim().toLowerCase();

  switch (normalized) {
    case "protagonist":
      return "主角";
    case "heroine":
      return "女主";
    case "antagonist":
      return "反派";
    case "supporting":
      return "配角";
    default:
      return String(role).toUpperCase();
  }
}

export function clampText(text: string, max = 160) {
  const trimmed = (text ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function toChapterNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const numeric = Number.parseInt(normalized.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : null;
}

export function formatChapterLabel(value: number | string | null | undefined) {
  const chapter = toChapterNumber(value);
  return chapter === null ? "" : `第${chapter}章`;
}

export function formatChapterCount(value: number | string | null | undefined) {
  const count = toChapterNumber(value);
  return count === null ? "0章" : `${count}章`;
}

const chineseDigitMap: Record<string, number> = {
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

function chineseNumberToArabic(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^[零〇一二两三四五六七八九]+$/.test(normalized)) {
    return Number(
      normalized
        .split("")
        .map((char) => chineseDigitMap[char] ?? "")
        .join(""),
    );
  }

  let result = 0;
  let section = 0;
  let digit = 0;

  for (const char of normalized) {
    const mapped = chineseDigitMap[char];
    if (typeof mapped === "number") {
      digit = mapped;
      continue;
    }

    if (char === "十") {
      section += (digit || 1) * 10;
      digit = 0;
      continue;
    }

    if (char === "百") {
      section += (digit || 1) * 100;
      digit = 0;
      continue;
    }

    if (char === "千") {
      section += (digit || 1) * 1000;
      digit = 0;
      continue;
    }

    if (char === "万") {
      result += (section + digit) * 10000;
      section = 0;
      digit = 0;
      continue;
    }

    return null;
  }

  const total = result + section + digit;
  return total > 0 ? total : null;
}

function normalizeChapterRangeLabel(value: string) {
  return (value ?? "")
    .replace(
      /第\s*(\d+)\s*(?:[-~—–]|到|至)\s*(\d+)\s*章/g,
      (_, start: string, end: string) =>
        formatChapterRange(Number.parseInt(start, 10), Number.parseInt(end, 10)),
    )
    .replace(
      /第\s*([零〇一二两三四五六七八九十百千万]+)\s*(?:[-~—–]|到|至)\s*([零〇一二两三四五六七八九十百千万]+)\s*章/g,
      (match: string, start: string, end: string) => {
        const startChapter = chineseNumberToArabic(start);
        const endChapter = chineseNumberToArabic(end);
        return startChapter && endChapter ? formatChapterRange(startChapter, endChapter) : match;
      },
    )
    .replace(/第\s*(\d+)\s*章/g, (_, chapter: string) => formatChapterLabel(chapter))
    .replace(/第\s*([零〇一二两三四五六七八九十百千万]+)\s*章/g, (match: string, chapter: string) => {
      const converted = chineseNumberToArabic(chapter);
      return converted ? formatChapterLabel(converted) : match;
    });
}

export function normalizeChapterCopy(value: string) {
  return normalizeChapterRangeLabel(value)
    .replace(/前\s*(\d+)\s*章/g, (_, count: string) => `前${Number.parseInt(count, 10)}章`)
    .replace(/(\d+)\s*章/g, (_, count: string) => `${Number.parseInt(count, 10)}章`);
}

export function formatChapterDisplayTitle(chapter: Pick<ChapterListItem, "index" | "title">) {
  const fallback = formatChapterLabel(chapter.index);
  const title = (chapter.title ?? "").trim();
  if (!title) return fallback;

  const numericMatch = title.match(/^第\s*(\d+)\s*章(.*)$/);
  if (numericMatch) {
    const suffix = normalizeChapterCopy(numericMatch[2].trim());
    return `${formatChapterLabel(numericMatch[1])}${suffix ? ` ${suffix}` : ""}`;
  }

  const chineseMatch = title.match(/^第\s*([零〇一二两三四五六七八九十百千万]+)\s*章(.*)$/);
  if (!chineseMatch) return normalizeChapterCopy(title);

  const converted = chineseNumberToArabic(chineseMatch[1]) ?? chapter.index;
  const suffix = normalizeChapterCopy(chineseMatch[2].trim());
  return `${formatChapterLabel(converted)}${suffix ? ` ${suffix}` : ""}`;
}

function formatChapterRange(startChapter?: number, endChapter?: number) {
  if (typeof startChapter !== "number" || typeof endChapter !== "number") return "";
  return startChapter === endChapter
    ? formatChapterLabel(startChapter)
    : `第${Math.trunc(startChapter)}-${Math.trunc(endChapter)}章`;
}

function extractChapterRangePrefix(value: string) {
  const raw = (value ?? "").trim();
  if (!raw) return { range: "", rest: "" };

  const match = raw.match(
    /^(第\s*\d+\s*(?:[-~—–]|到|至)\s*\d+\s*章|第\s*\d+\s*章)/,
  );

  if (!match) return { range: "", rest: raw };

  const range = normalizeChapterRangeLabel(match[1].replace(/\s+/g, ""));
  let rest = raw.slice(match[0].length).trim();
  rest = rest.replace(/^[：:，,\-—–\s]+/, "").trim();

  return { range, rest: normalizeChapterCopy(rest) };
}

function parseVolumeSegments(value: string) {
  const raw = (value ?? "").trim();
  if (!raw) return { intro: "", segments: [] as VolumeSegment[] };

  const chapterRangeRegex = /第\s*(\d+)\s*(?:[-~—–]|到|至)\s*(\d+)\s*章/;
  const lines = raw
    .replace(/[；;]\s*/g, "\n")
    .split(/\r?\n/)
    .map((line) => normalizeChapterCopy(line.replace(/^[\s*\\-]+/, "").trim()))
    .filter(Boolean);

  const introLines: string[] = [];
  const segments: Array<VolumeSegment & { descLines?: string[] }> = [];
  let current: { title: string; range: string; descLines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const desc = normalizeChapterCopy(current.descLines.join(" ").replace(/\s+/g, " ").trim());
    segments.push({
      title: normalizeChapterCopy(current.title),
      range: normalizeChapterRangeLabel(current.range),
      desc,
      descLines: undefined,
    });
  };

  const parseHeaderLine = (line: string) => {
    const match = line.match(chapterRangeRegex);
    if (!match) return null;

    const range = formatChapterRange(Number.parseInt(match[1], 10), Number.parseInt(match[2], 10));
    let title = line.replace(match[0], "").trim();
    title = title.replace(/^[：:，,\-—–\s]+/, "").trim();

    let inlineDesc = "";
    const splitMatch = title.match(/^(.+?)[：:\|｜丨](.+)$/);
    if (splitMatch) {
      title = splitMatch[1].trim();
      inlineDesc = splitMatch[2].trim();
    } else {
      const dashMatch = title.match(/^(.+?)[-—–]\s*(.+)$/);
      if (dashMatch) {
        title = dashMatch[1].trim();
        inlineDesc = dashMatch[2].trim();
      }
    }

    if (!title) title = range;
    return {
      title: normalizeChapterCopy(title),
      range,
      inlineDesc: normalizeChapterCopy(inlineDesc),
    };
  };

  for (const line of lines) {
    const header = parseHeaderLine(line);
    if (header) {
      flush();
      current = { title: header.title, range: header.range, descLines: [] };
      if (header.inlineDesc) current.descLines.push(normalizeChapterCopy(header.inlineDesc));
      continue;
    }

    if (current) current.descLines.push(normalizeChapterCopy(line));
    else introLines.push(normalizeChapterCopy(line));
  }

  flush();

  const sanitized = segments
    .map(({ title, range, desc }) => ({
      title: normalizeChapterCopy(title),
      range: normalizeChapterRangeLabel(range),
      desc: normalizeChapterCopy(desc || title),
    }))
    .filter((segment) => segment.title || segment.desc);

  return { intro: introLines.join(" ").trim(), segments: sanitized };
}

function splitOutlineBullets(value: string) {
  const raw = (value ?? "").trim();
  if (!raw) return [];

  const cleanup = (item: string) =>
    normalizeChapterCopy(item.replace(/^[\s*\\-]+/, "").replace(/^\d+[.)、]\s*/, "").trim());

  const byLines = raw.split(/\r?\n/).map(cleanup).filter(Boolean);
  if (byLines.length > 1) return byLines;

  const bySemi = raw.split(/[；;]+/).map(cleanup).filter(Boolean);
  if (bySemi.length > 1) return bySemi;

  return raw
    .split(/[。！？]/)
    .map(cleanup)
    .filter(Boolean);
}

function normalizeStructuredSegments(volume: OutlineVolume) {
  return (volume.segments ?? [])
    .slice()
    .sort(
      (left, right) =>
        (left.startChapter ?? Number.MAX_SAFE_INTEGER) -
        (right.startChapter ?? Number.MAX_SAFE_INTEGER),
    )
    .map((segment) => ({
      title:
        normalizeChapterCopy(segment.title) ||
        formatChapterRange(segment.startChapter, segment.endChapter) ||
        "章节段落",
      range: formatChapterRange(segment.startChapter, segment.endChapter),
      startChapter: segment.startChapter,
      endChapter: segment.endChapter,
      desc: normalizeChapterCopy(segment.desc || segment.title || ""),
    }))
    .filter((segment) => segment.title || segment.desc);
}

export function formatVolumeDesc(volume: OutlineVolume) {
  const raw = (volume.desc ?? "").trim();
  if (!raw)
    return {
      range: formatChapterRange(volume.startChapter, volume.endChapter),
      rest: "",
      segments: normalizeStructuredSegments(volume),
      bullets: [] as string[],
    };

  const { range, rest } = extractChapterRangePrefix(raw);
  const structuredSegments = normalizeStructuredSegments(volume);
  const structuredRange = formatChapterRange(volume.startChapter, volume.endChapter);

  if (structuredSegments.length) {
    const preview =
      rest ||
      structuredSegments
        .slice(0, 3)
        .map((segment) => segment.desc || segment.title)
        .filter(Boolean)
        .join("；");

    return {
      range: structuredRange || range,
      rest: preview,
      segments: structuredSegments,
      bullets: [] as string[],
    };
  }

  const parsedSegments = parseVolumeSegments(rest);
  const segments = parsedSegments.segments;
  const effectiveRest = normalizeChapterCopy(
    segments.length ? parsedSegments.intro : parsedSegments.intro || rest,
  );
  const bullets = segments.length ? [] : splitOutlineBullets(rest).slice(0, 10);

  return {
    range: normalizeChapterRangeLabel(range || structuredRange),
    rest: effectiveRest,
    segments,
    bullets,
  };
}

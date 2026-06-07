import {
  SHORT_STORY_ENDING_LABELS,
  type ShortStoryEndingType,
} from "@/shared/schemas/short-story";

export type ShortStoryOutlineCharacterView = {
  name: string;
  role: string;
  description: string;
};

export type ShortStoryOutlineBeatView = {
  index: number;
  title: string;
  purpose: string;
  targetWords: number | null;
  writingPrompt: string;
};

export type ShortStoryOutlineViewModel = {
  tag: string;
  title: string;
  synopsis: string;
  targetWords: number | null;
  theme: string;
  hook: string;
  endingType: string;
  endingLabel: string;
  characters: ShortStoryOutlineCharacterView[];
  beats: ShortStoryOutlineBeatView[];
  fullOutline: string;
  fallbackText: string;
  parseFailed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function summarizeUnknownOutline(value: unknown) {
  if (typeof value === "string") return value.trim().slice(0, 1200);
  if (!value) return "";

  try {
    return JSON.stringify(value, null, 2).slice(0, 1200);
  } catch {
    return "";
  }
}

export function parseMaybeJsonOutline(value: unknown) {
  if (typeof value !== "string") {
    return { value, parseFailed: false };
  }

  const trimmed = value.trim();
  if (!trimmed) return { value: null, parseFailed: false };

  try {
    return { value: JSON.parse(trimmed) as unknown, parseFailed: false };
  } catch {
    return { value: trimmed, parseFailed: true };
  }
}

function normalizeCharacters(value: unknown): ShortStoryOutlineCharacterView[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const name = readString(item.name);
      const role = readString(item.role);
      const description = readString(item.description) || readString(item.desc);
      if (!name && !role && !description) return null;

      return {
        name: name || "未命名角色",
        role: role || "角色",
        description,
      };
    })
    .filter((item): item is ShortStoryOutlineCharacterView => Boolean(item));
}

function normalizeBeats(value: unknown): ShortStoryOutlineBeatView[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const title = readString(item.title);
      const purpose = readString(item.purpose) || readString(item.summary);
      const writingPrompt = readString(item.writingPrompt) || readString(item.prompt);
      if (!title && !purpose && !writingPrompt) return null;

      return {
        index: readNumber(item.index) ?? index + 1,
        title: title || `节点 ${index + 1}`,
        purpose,
        targetWords: readNumber(item.targetWords),
        writingPrompt,
      };
    })
    .filter((item): item is ShortStoryOutlineBeatView => Boolean(item))
    .sort((left, right) => left.index - right.index);
}

export function getShortStoryEndingLabel(endingType?: string | null) {
  if (endingType && endingType in SHORT_STORY_ENDING_LABELS) {
    return SHORT_STORY_ENDING_LABELS[endingType as ShortStoryEndingType];
  }

  return endingType || "未指定";
}

export function buildShortStoryOutlineViewModel(
  outlineInput: unknown,
  rawOutlineInput?: unknown,
): ShortStoryOutlineViewModel {
  const parsedOutline = parseMaybeJsonOutline(outlineInput);
  const outline = parsedOutline.value;
  const parsedRaw = parseMaybeJsonOutline(rawOutlineInput);
  const rawOutline = parsedRaw.value;
  const source = isRecord(outline) ? outline : isRecord(rawOutline) ? rawOutline : null;
  const nestedInput = source && isRecord(source.input) ? source.input : null;
  const fallbackText =
    summarizeUnknownOutline(outline) ||
    summarizeUnknownOutline(rawOutline) ||
    "短篇结构暂时不可解析，仍可继续阅读、润色和导出正文。";

  if (!source) {
    return {
      tag: "",
      title: "",
      synopsis: "",
      targetWords: null,
      theme: "",
      hook: "",
      endingType: "",
      endingLabel: "未指定",
      characters: [],
      beats: [],
      fullOutline: "",
      fallbackText,
      parseFailed: parsedOutline.parseFailed || parsedRaw.parseFailed || Boolean(fallbackText),
    };
  }

  const endingType = readString(source.endingType) || readString(nestedInput?.endingType);
  return {
    tag: readString(source.tag),
    title: readString(source.title),
    synopsis: readString(source.synopsis),
    targetWords: readNumber(source.targetWords) ?? readNumber(nestedInput?.targetWords),
    theme: readString(source.theme),
    hook: readString(source.hook),
    endingType,
    endingLabel: getShortStoryEndingLabel(endingType),
    characters: normalizeCharacters(source.characters),
    beats: normalizeBeats(source.beats),
    fullOutline: readString(source.fullOutline) || readString(source.outline),
    fallbackText,
    parseFailed: parsedOutline.parseFailed || parsedRaw.parseFailed,
  };
}

export function getShortStoryOutlineCount(outlineInput: unknown, rawOutlineInput?: unknown) {
  const outline = buildShortStoryOutlineViewModel(outlineInput, rawOutlineInput);
  return {
    beats: outline.beats.length,
    characters: outline.characters.length,
  };
}

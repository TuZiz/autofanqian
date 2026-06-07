import { isShortStoryWork, type WorkTypeValue } from "@/shared/work-type";

type ProgressInput = {
  words?: string | null;
  targetChapters?: number | null;
  plannedUntilChapter?: number | null;
  completionPercent: number;
  workType?: WorkTypeValue | string | null;
};

export type ProgressCopy = {
  label: string;
  value: string;
  hint: string;
  percent: number;
  hasTarget: boolean;
};

type EditorialTone = {
  coverGradient: string;
  coverTextClassName: string;
  chipClassName: string;
};

const EDITORIAL_TONES: EditorialTone[] = [
  {
    coverGradient: "linear-gradient(145deg, #ff7a45 0%, #7c5cff 100%)",
    coverTextClassName: "text-white",
    chipClassName: "bg-orange-50 text-orange-800 ring-1 ring-orange-100",
  },
  {
    coverGradient: "linear-gradient(145deg, #e24c77 0%, #f6a44f 100%)",
    coverTextClassName: "text-white",
    chipClassName: "bg-rose-50 text-rose-800 ring-1 ring-rose-100",
  },
  {
    coverGradient: "linear-gradient(145deg, #2f7dd3 0%, #8b5cf6 100%)",
    coverTextClassName: "text-white",
    chipClassName: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
  },
  {
    coverGradient: "linear-gradient(145deg, #7a5b42 0%, #d98b51 100%)",
    coverTextClassName: "text-white",
    chipClassName: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  },
];

export function getEditorialTone(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % EDITORIAL_TONES.length;
  }

  return EDITORIAL_TONES[hash] ?? EDITORIAL_TONES[0];
}

export function parseTargetWordCount(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const amount = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (normalized.includes("万") || normalized.includes("w")) {
    return Math.round(amount * 10_000);
  }

  return Math.round(amount);
}

export function getProgressCopy(input: ProgressInput): ProgressCopy {
  const percent = Math.max(0, Math.min(100, Math.round(input.completionPercent || 0)));
  const targetWordCount = parseTargetWordCount(input.words);
  const hasPlanningWindow = Boolean(input.plannedUntilChapter || input.targetChapters);
  const shortStory = isShortStoryWork(input.workType);

  if (targetWordCount) {
    return {
      label: shortStory ? "短篇完成度" : "目标完成度",
      value: `${percent}%`,
      hint: `目标 ${targetWordCount.toLocaleString("zh-CN")} 字`,
      percent,
      hasTarget: true,
    };
  }

  if (hasPlanningWindow) {
    const planLabel = shortStory
      ? `已拆分 ${input.plannedUntilChapter || input.targetChapters || 0} 个场景`
      : input.plannedUntilChapter
        ? `已规划到第 ${input.plannedUntilChapter} 章`
        : `长期目标 ${input.targetChapters} 章`;

    return {
      label: shortStory ? "场景完成度" : "规划窗口完成度",
      value: `${percent}%`,
      hint: planLabel,
      percent,
      hasTarget: true,
    };
  }

  return {
    label: "未设定总目标",
    value: "-",
    hint: "建议补充字数目标或规划窗口",
    percent: 0,
    hasTarget: false,
  };
}

export function getPlanningLabel(input: {
  targetChapters?: number | null;
  plannedUntilChapter?: number | null;
  workType?: WorkTypeValue | string | null;
}) {
  if (isShortStoryWork(input.workType)) {
    const count = input.plannedUntilChapter || input.targetChapters;
    return count ? `${count} 个场景` : "未拆分场景";
  }

  if (input.plannedUntilChapter) {
    return `已规划至第 ${input.plannedUntilChapter} 章`;
  }

  if (input.targetChapters) {
    return `长线目标 ${input.targetChapters} 章`;
  }

  return "未设定总目标";
}

export function getChapterLine(input: {
  workType?: WorkTypeValue | string | null;
  chapter: {
    index: number;
    title: string | null;
    wordCount: number;
  };
}) {
  const shortStory = isShortStoryWork(input.workType);
  const unit = shortStory ? "场景" : "章";

  if (input.chapter.title?.trim()) {
    return shortStory
      ? `场景 ${input.chapter.index} · ${input.chapter.title.trim()}`
      : `第 ${input.chapter.index} 章 · ${input.chapter.title.trim()}`;
  }

  if (input.chapter.wordCount > 0) {
    return shortStory
      ? `场景 ${input.chapter.index} · 正在写作`
      : `第 ${input.chapter.index} 章 · 正在写作`;
  }

  return shortStory
    ? `${unit} ${input.chapter.index} · 还未开始`
    : `第 ${input.chapter.index} ${unit} · 还未开始`;
}

const HAN_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;
const FALLBACK_INITIAL_PATTERN = /[A-Za-z0-9]/u;

export function getTitleInitial(title: string) {
  const hanCharacter = title.match(HAN_CHARACTER_PATTERN)?.[0];

  if (hanCharacter) {
    return hanCharacter;
  }

  return title.match(FALLBACK_INITIAL_PATTERN)?.[0]?.toUpperCase() ?? "书";
}

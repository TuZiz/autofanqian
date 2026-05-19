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
    coverGradient:
      "linear-gradient(145deg, rgba(33, 37, 32, 0.96) 0%, rgba(70, 87, 65, 0.96) 48%, rgba(184, 191, 153, 0.92) 100%)",
    coverTextClassName: "text-white/82",
    chipClassName: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
  },
  {
    coverGradient:
      "linear-gradient(145deg, rgba(62, 45, 34, 0.96) 0%, rgba(131, 88, 62, 0.94) 48%, rgba(234, 205, 160, 0.92) 100%)",
    coverTextClassName: "text-stone-950/72",
    chipClassName: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  },
  {
    coverGradient:
      "linear-gradient(145deg, rgba(42, 43, 38, 0.96) 0%, rgba(104, 92, 70, 0.94) 50%, rgba(230, 219, 198, 0.92) 100%)",
    coverTextClassName: "text-white/80",
    chipClassName: "bg-stone-100 text-stone-700 ring-1 ring-stone-200/80",
  },
  {
    coverGradient:
      "linear-gradient(145deg, rgba(34, 58, 48, 0.96) 0%, rgba(91, 124, 106, 0.94) 48%, rgba(207, 222, 189, 0.92) 100%)",
    coverTextClassName: "text-white/84",
    chipClassName: "bg-lime-50 text-lime-800 ring-1 ring-lime-100",
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
      label: shortStory ? "短篇完成度" : "规划目标完成度",
      value: `${percent}%`,
      hint: `按字数目标计算 · 目标 ${targetWordCount.toLocaleString("zh-CN")} 字`,
      percent,
      hasTarget: true,
    };
  }

  if (hasPlanningWindow) {
    const planLabel = shortStory
      ? `已拆成 ${input.plannedUntilChapter || input.targetChapters || 0} 个场景`
      : input.plannedUntilChapter
        ? `当前已规划到第 ${input.plannedUntilChapter} 章`
        : `长期目标 ${input.targetChapters} 章`;

    return {
      label: shortStory ? "短篇场景完成度" : "当前规划窗口完成度",
      value: `${percent}%`,
      hint: planLabel,
      percent,
      hasTarget: true,
    };
  }

  return {
    label: "未设定总目标",
    value: "—",
    hint: "建议先补一个规划窗口或字数目标",
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
    return `规划至第 ${input.plannedUntilChapter} 章`;
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
  const unit = isShortStoryWork(input.workType) ? "场景" : "章";
  if (input.chapter.title?.trim()) {
    return isShortStoryWork(input.workType)
      ? `场景 ${input.chapter.index} · ${input.chapter.title.trim()}`
      : `第 ${input.chapter.index} 章 · ${input.chapter.title.trim()}`;
  }

  if (input.chapter.wordCount > 0) {
    return isShortStoryWork(input.workType)
      ? `场景 ${input.chapter.index} · 正在写作`
      : `第 ${input.chapter.index} 章 · 正在写作`;
  }

  return isShortStoryWork(input.workType)
    ? `${unit} ${input.chapter.index} · 还未开始`
    : `第 ${input.chapter.index} 章 · 还未开始`;
}

export function getTitleInitial(title: string) {
  return title.replace(/[《》\s]/g, "").trim().slice(0, 1) || "书";
}

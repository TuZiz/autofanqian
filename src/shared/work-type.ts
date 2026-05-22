export const WORK_TYPES = ["long_novel", "short_story"] as const;

export type WorkTypeValue = (typeof WORK_TYPES)[number];

export const WORK_LIBRARY_TYPE_FILTERS = ["all", "long", "short"] as const;

export type WorkLibraryTypeFilter = (typeof WORK_LIBRARY_TYPE_FILTERS)[number];

export function isShortStoryWork(workType?: string | null) {
  return workType === "short_story";
}

export function matchesWorkLibraryTypeFilter(
  workType: string | null | undefined,
  filter: WorkLibraryTypeFilter,
) {
  if (filter === "all") return true;
  if (filter === "short") return isShortStoryWork(workType);
  return !isShortStoryWork(workType);
}

export function getWorkTypeBadgeCopy(workType?: string | null) {
  if (isShortStoryWork(workType)) {
    return {
      primary: "短篇",
      secondary: "一篇完结",
      libraryLabel: "短篇故事",
    };
  }

  return {
    primary: "长篇",
    secondary: "连载作品",
    libraryLabel: "长篇小说",
  };
}

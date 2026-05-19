export const WORK_TYPES = ["long_novel", "short_story"] as const;

export type WorkTypeValue = (typeof WORK_TYPES)[number];

export function isShortStoryWork(workType?: string | null) {
  return workType === "short_story";
}

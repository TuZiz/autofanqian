import { isShortStoryWork } from "@/shared/work-type";

export function formatWorkbenchDocumentLabel(index: number, workType?: string | null) {
  const safeIndex = Math.max(1, Math.trunc(index) || 1);

  if (isShortStoryWork(workType)) {
    return safeIndex <= 1 ? "短篇正文" : `Beat ${safeIndex}`;
  }

  return `第${safeIndex}章`;
}

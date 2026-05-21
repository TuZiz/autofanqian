import "server-only";

export const SNAPSHOT_SOURCES = [
  "ai_generate",
  "ai_regenerate",
  "ai_rewrite",
  "restore_before",
] as const;

const MANUAL_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const CONTENT_CHANGE_THRESHOLD = 300;

export type ChapterRevisionPolicyInput = {
  previousContent: string;
  nextContent?: string;
  revisionSource?: string | null;
  lastRevisionAt?: Date | null;
  now?: Date;
};

export type ChapterRevisionPolicyResult = {
  shouldSnapshot: boolean;
  reason: string;
};

function changedChars(left: string, right: string) {
  if (left === right) return 0;
  const min = Math.min(left.length, right.length);
  let prefix = 0;
  while (prefix < min && left[prefix] === right[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < min - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return Math.max(left.length, right.length) - prefix - suffix;
}

export function shouldCreateChapterRevisionSnapshot(
  input: ChapterRevisionPolicyInput,
): ChapterRevisionPolicyResult {
  const source = input.revisionSource || "manual_save";
  if (SNAPSHOT_SOURCES.includes(source as (typeof SNAPSHOT_SOURCES)[number])) {
    return { shouldSnapshot: true, reason: source };
  }

  if (source !== "manual_save") {
    return { shouldSnapshot: false, reason: "source_without_snapshot" };
  }

  const nextContent = input.nextContent;
  if (typeof nextContent === "string") {
    const diff = changedChars(input.previousContent, nextContent);
    if (diff > CONTENT_CHANGE_THRESHOLD) {
      return { shouldSnapshot: true, reason: `content_changed_${diff}` };
    }
  }

  if (!input.lastRevisionAt) {
    return { shouldSnapshot: true, reason: "first_manual_snapshot" };
  }

  const now = input.now ?? new Date();
  if (now.getTime() - input.lastRevisionAt.getTime() > MANUAL_SNAPSHOT_INTERVAL_MS) {
    return { shouldSnapshot: true, reason: "manual_interval_elapsed" };
  }

  return { shouldSnapshot: false, reason: "manual_snapshot_throttled" };
}

export type LongShortStoryResultState = {
  finalWorkId?: string | null;
};

export type ExistingShortStoryChapterState = {
  status?: string | null;
  content?: string | null;
};

export function shouldSkipLongShortStoryJobForExistingChapter(
  state: LongShortStoryResultState | null | undefined,
  chapter: ExistingShortStoryChapterState | null | undefined,
) {
  return Boolean(
    state?.finalWorkId &&
      chapter?.status === "written" &&
      typeof chapter.content === "string" &&
      chapter.content.trim(),
  );
}

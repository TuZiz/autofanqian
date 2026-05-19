import type { StoryOutline } from "@/lib/create/outline-draft";
import type { ShortStoryOutline } from "@/lib/create/short-story-outline-schema";
import type { SessionAccessFields } from "@/lib/auth/session-user-types";
import type { WorkTypeValue } from "@/shared/work-type";

export type SessionUser = SessionAccessFields & {
  email: string;
};

export type WorkDetail = {
  id: string;
  workType: WorkTypeValue;
  genreId: string;
  genreLabel: string | null;
  idea: string;
  tags: string[];
  platformId: string | null;
  platformLabel: string | null;
  words: string | null;
  dnaBookTitle: string | null;
  tag: string;
  title: string;
  synopsis: string;
  outline: StoryOutline | ShortStoryOutline;
  targetChapters?: number | null;
  plannedUntilChapter?: number | null;
  planningMode?: "progressive" | string | null;
  rawOutline?: StoryOutline | ShortStoryOutline | null;
  createdAt: string;
  updatedAt: string;
};

export type ChapterListItem = {
  id: string;
  index: number;
  title: string | null;
  wordCount: number;
  updatedAt: string;
  createdAt: string;
};

export type ChaptersOverview = {
  work: {
    id: string;
    workType: WorkTypeValue;
    title: string;
    tag: string;
    targetChapters?: number | null;
    plannedUntilChapter?: number | null;
  };
  nextIndex: number;
  maxIndex: number;
  lastEditedIndex: number;
  chapters: ChapterListItem[];
};

export type VolumeSegment = {
  title: string;
  range: string;
  startChapter?: number;
  endChapter?: number;
  desc: string;
};

export type HeaderChip = {
  label: string;
  tone?: "brand" | "muted";
};

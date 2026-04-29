import type { StoryOutline } from "@/lib/create/outline-draft";

export type SessionUser = {
  email: string;
  isAdmin?: boolean;
};

export type WorkDetail = {
  id: string;
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
  outline: StoryOutline;
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
  work: { id: string; title: string; tag: string };
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

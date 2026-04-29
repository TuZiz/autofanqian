import type { StoryOutline } from "@/lib/create/outline-draft";

export type ChapterSessionUser = {
  email: string;
  isAdmin?: boolean;
};

export type WorkLite = {
  id: string;
  title: string;
  tag: string;
  outline?: StoryOutline | null;
};

export type ChapterDetail = {
  id: string;
  index: number;
  title: string | null;
  content: string;
  wordCount: number;
  summary?: string | null;
  chapterOutline?: string | null;
  details?: string[];
  updatedAt: string;
  createdAt: string;
};

export type ChapterBootstrap = {
  work: WorkLite;
  chapter: ChapterDetail;
};

export type ChapterListItem = {
  id: string;
  index: number;
  title: string | null;
  wordCount: number;
  updatedAt: string;
  createdAt: string;
};

export type ChapterOverview = {
  nextIndex: number;
  maxIndex: number;
  lastEditedIndex: number;
  chapters: ChapterListItem[];
};

export type MetaPatch = {
  summary?: string | null;
  chapterOutline?: string | null;
  details?: string[];
};

export type MetaEditorKind = "summary" | "outline" | "details";
export type CopyTarget = "title" | "content";

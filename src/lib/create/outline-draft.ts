export const CREATE_OUTLINE_DRAFT_STORAGE_KEY = "tomato:create:outline_draft:v1";
export const CREATE_OUTLINE_RESULT_CACHE_KEY = "tomato:create:outline_result_cache:v1";

export type CreateOutlineDraft = {
  genre: string;
  genreLabel?: string;
  idea: string;
  tags?: string[];
  platform?: string;
  platformLabel?: string;
  dnaBookTitle?: string;
  words?: string;
};

export type StoryOutlineRole = "protagonist" | "heroine" | "antagonist" | "supporting";

export type StoryOutlineSegment = {
  title: string;
  startChapter: number;
  endChapter: number;
  desc: string;
};

export type StoryOutlineVolume = {
  name: string;
  desc: string;
  startChapter?: number;
  endChapter?: number;
  segments?: StoryOutlineSegment[];
};

export type StoryOutline = {
  tag: string;
  title: string;
  synopsis: string;
  totalChapters?: number;
  volumes: StoryOutlineVolume[];
  characters: Array<{ name: string; role: StoryOutlineRole; desc: string }>;
};

export type ChapterGenerationStatus = "running" | "done" | "error";

export type ChapterGenerationStage =
  | "prepare"
  | "context"
  | "draft"
  | "polish"
  | "finalize";

export type ChapterGenerationResult = {
  work: {
    id: string;
    title: string;
    tag: string;
  };
  chapter: {
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
};

export type ChapterGenerationSnapshot = {
  key: string;
  workId: string;
  index: number;
  status: ChapterGenerationStatus;
  stage?: ChapterGenerationStage;
  progress: number;
  startedAt: number;
  updatedAt: number;
  message?: string;
  error?: string;
  result?: ChapterGenerationResult;
};

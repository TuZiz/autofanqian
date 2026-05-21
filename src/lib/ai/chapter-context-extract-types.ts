import type { SessionUser } from "@/lib/auth/user";

export type ContextExtractionUser = Pick<SessionUser, "id" | "email" | "role">;

export type QueueChapterContextExtractionParams = {
  user: ContextExtractionUser;
  workId: string;
  chapterId: string;
  index: number;
  trigger: "save" | "generate" | "stream_generate" | "rewrite_apply";
  force?: boolean;
  generationJobId?: string | null;
};

export type ContextExtractionCharacter = {
  id: string;
  name: string;
  aliases: string[];
  currentState: string | null;
  goal: string | null;
};

export type ContextExtractionChapter = {
  id: string;
  summary: string | null;
  details: unknown;
};

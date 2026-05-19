export type ChapterStreamEvent =
  | { type: "start"; key: string; workId: string; index: number; mode: "generate" | "regenerate" }
  | { type: "progress"; progress: number; message: string }
  | { type: "delta"; title?: string; contentDelta?: string; receivedChars: number }
  | {
      type: "done";
      chapter: {
        id: string;
        index: number;
        title: string | null;
        content: string;
        wordCount: number;
        summary?: string | null;
        chapterOutline?: string | null;
        details?: unknown;
        updatedAt: string;
        createdAt: string;
      };
      work: { id: string; workType: "long_novel" | "short_story"; title: string; tag: string };
    }
  | { type: "aborted"; savedDraft: boolean; message: string }
  | { type: "error"; message: string };

export function encodeSse(event: ChapterStreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createSseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

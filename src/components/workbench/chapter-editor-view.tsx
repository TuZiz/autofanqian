import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";

import { ChapterRewriteDialog } from "./chapter-rewrite-dialog";
import { ChapterRevisionDialog } from "./chapter-revision-dialog";
import { ChapterEditorHeader } from "./chapter-editor-header";
import { ChapterEditorMain } from "./chapter-editor-main";
import {
  DetailEditorDialog,
  MetaGenerateDialog,
  MetaEditorDialog,
  RegenerateDialog,
} from "./chapter-editor-modals";
import { ChapterEditorSidebar } from "./chapter-editor-sidebar";

export function ChapterEditorView({ editor }: { editor: WorkChapterEditorController }) {
  return (
    <div className="app-work-surface relative min-h-dvh overflow-x-clip font-sans transition-colors duration-300 selection:bg-emerald-200/50 dark:selection:bg-emerald-500/30">
      <div className="relative z-10 flex min-h-dvh flex-col">
        <ChapterEditorHeader editor={editor} />

        <main className="mx-auto grid min-h-0 w-full max-w-[1560px] flex-1 grid-cols-1 items-stretch gap-3 px-3 py-2 sm:px-4 sm:py-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-4 lg:px-5">
          <ChapterEditorMain editor={editor} />
          <ChapterEditorSidebar editor={editor} />
        </main>
      </div>

      <DetailEditorDialog />
      <RegenerateDialog editor={editor} />
      <MetaGenerateDialog editor={editor} />
      <MetaEditorDialog editor={editor} />
      <ChapterRevisionDialog editor={editor} />
      <ChapterRewriteDialog editor={editor} />
    </div>
  );
}

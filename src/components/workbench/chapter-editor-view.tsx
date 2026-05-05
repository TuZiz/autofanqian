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
    <div className="relative min-h-screen overflow-x-clip bg-zinc-50 font-sans text-zinc-900 transition-colors duration-500 selection:bg-blue-200/50 dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-blue-500/30">
      {/* 沉浸式弥散背景 */}
      <div className="pointer-events-none fixed inset-0 z-0 app-noise opacity-[0.02] dark:opacity-[0.03]" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[20%] h-[50%] w-[50%] rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-500/10" />
        <div className="absolute -right-[10%] top-[40%] h-[40%] w-[40%] rounded-full bg-purple-400/10 blur-[120px] dark:bg-purple-500/10" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <ChapterEditorHeader editor={editor} />

        <main className="mx-auto grid w-full max-w-[1540px] flex-1 grid-cols-1 items-stretch gap-6 px-4 py-6 sm:px-6 md:py-8 lg:grid-cols-12 lg:gap-8 lg:px-8">
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

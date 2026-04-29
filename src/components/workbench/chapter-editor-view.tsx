import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";

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
    <div className="relative min-h-screen overflow-x-clip bg-[#f6f7f3] font-sans text-slate-950 antialiased selection:bg-sky-200 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-sky-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 app-noise opacity-[0.025] dark:opacity-[0.04]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-40 border-b border-slate-900/[0.04] bg-white/55 dark:border-white/[0.06] dark:bg-slate-900/30" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <ChapterEditorHeader editor={editor} />

        <main className="grid w-full flex-1 grid-cols-1 items-stretch gap-4 px-3 py-4 sm:px-4 md:gap-5 md:px-6 lg:grid-cols-12 lg:px-8">
          <ChapterEditorMain editor={editor} />
          <ChapterEditorSidebar editor={editor} />
        </main>
      </div>

      <DetailEditorDialog />
      <RegenerateDialog editor={editor} />
      <MetaGenerateDialog editor={editor} />
      <MetaEditorDialog editor={editor} />
    </div>
  );
}

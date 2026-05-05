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
    <div className="relative min-h-screen overflow-x-clip bg-zinc-50 font-sans text-zinc-900 transition-colors duration-500 selection:bg-blue-500/30 dark:bg-black dark:text-zinc-50">
      {/* 沉浸式弥散背景 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px] mix-blend-multiply dark:bg-blue-600/10" />
        <div className="absolute right-[-5%] top-[10%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px] mix-blend-multiply dark:bg-purple-600/10" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <ChapterEditorHeader editor={editor} />

        <main className="grid w-full flex-1 grid-cols-1 items-stretch gap-6 px-4 py-6 md:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12 xl:px-16">
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

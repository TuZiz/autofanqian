"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

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
import { ChapterEditorLeftNav } from "./chapter-editor-left-nav";
import { ChapterEditorSidebar } from "./chapter-editor-sidebar";

export function ChapterEditorView({ editor }: { editor: WorkChapterEditorController }) {
  const [focusMode, setFocusMode] = useState(false);

  return (
    <div className="app-work-surface relative min-h-dvh overflow-x-clip font-sans transition-colors duration-300 selection:bg-[var(--theme-brand-selection)]">
      <div className="pointer-events-none fixed inset-0 ds-surface-aurora" />
      <div className="pointer-events-none fixed inset-0 ds-paper-grain" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <ChapterEditorHeader editor={editor} />

        <main
          className={cn(
            "mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 items-stretch gap-3 px-3 py-3 sm:px-4 lg:gap-4 lg:px-5",
            focusMode
              ? "lg:grid-cols-1 xl:max-w-[980px]"
              : "lg:grid-cols-[minmax(0,1fr)_356px] xl:grid-cols-[260px_minmax(0,1fr)_356px] 2xl:grid-cols-[284px_minmax(0,1fr)_380px]",
          )}
        >
          {focusMode ? null : <ChapterEditorLeftNav editor={editor} />}
          <ChapterEditorMain editor={editor} />
          {focusMode ? null : <ChapterEditorSidebar editor={editor} />}
        </main>
      </div>

      <button
        type="button"
        aria-pressed={focusMode}
        onClick={() => setFocusMode((current) => !current)}
        className="fixed bottom-4 left-4 z-50 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-4 text-xs font-black text-[var(--theme-text-secondary)] shadow-[var(--theme-shadow-card)] backdrop-blur-xl transition hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-strong)]"
      >
        {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {focusMode ? "退出专注" : "专注模式"}
      </button>

      <DetailEditorDialog />
      <RegenerateDialog editor={editor} />
      <MetaGenerateDialog editor={editor} />
      <MetaEditorDialog editor={editor} />
      <ChapterRevisionDialog editor={editor} />
      <ChapterRewriteDialog editor={editor} />
    </div>
  );
}

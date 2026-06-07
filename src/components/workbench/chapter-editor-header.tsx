import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { formatWorkbenchDocumentLabel } from "@/lib/workbench/work-document-label";
import { isShortStoryWork } from "@/shared/work-type";
import { ChapterEditorMenu } from "./chapter-editor-menu";
import {
  normalizeChapterCopy,
  PrimaryAiButton,
  SaveStatusPill,
} from "./chapter-editor-header-status";

export function ChapterEditorHeader({ editor }: { editor: WorkChapterEditorController }) {
  const {
    aiButtonLabel,
    aiStageMessage,
    chapterIndex,
    dirty,
    effectiveAiBusy,
    effectiveAiProgress,
    error,
    handleAiActionClick,
    isAdmin,
    maxChapterIndex,
    metaSaving,
    saving,
    statusText,
    userDisplayName,
    work,
    workId,
  } = editor;
  const nextChapterLabel = formatWorkbenchDocumentLabel(
    Math.max(chapterIndex, maxChapterIndex) + 1,
    work?.workType,
  );
  const aiLabel = normalizeChapterCopy(effectiveAiBusy ? aiStageMessage : aiButtonLabel);
  const progress = Math.round(Math.max(0, Math.min(100, effectiveAiProgress)));
  const isShortStory = isShortStoryWork(work?.workType);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-sm backdrop-blur-xl/60">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-12 items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Link
              href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-[var(--theme-surface-solid)] hover:shadow-md hover:ring-[var(--theme-border)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--theme-brand-border)]"
              title="返回作品面板"
            >
              <ArrowLeft className="h-4 w-4 text-[var(--theme-text-muted)] transition-colors hover:text-[var(--theme-text-strong)]" />
            </Link>

            <div className="hidden h-8 w-px bg-[var(--theme-border)] sm:block" />

            <ChapterEditorMenu editor={editor} nextChapterLabel={nextChapterLabel} />
            {isShortStory ? (
              <span className="hidden rounded-lg bg-[var(--theme-brand-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)] sm:inline-flex">
                短篇正文
              </span>
            ) : null}
          </div>

          <div className="hidden min-w-0 items-center gap-4 md:flex">
            <SaveStatusPill
              dirty={dirty}
              error={error}
              metaSaving={metaSaving}
              saving={saving}
              statusText={statusText}
              aiBusy={effectiveAiBusy}
              aiLabel={aiStageMessage}
              aiProgress={progress}
            />
            <span className="max-w-[120px] truncate text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
              {userDisplayName || "创作者"}
            </span>
          </div>

          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)] transition-all hover:bg-[var(--theme-brand-soft)] hover:ring-[var(--theme-brand-border)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--theme-brand-border)]/20 sm:w-auto sm:gap-2 sm:px-4 sm:text-xs sm:font-semibold"
              title="管理员"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">管理员</span>
            </Link>
          ) : null}

          <PrimaryAiButton
            busy={effectiveAiBusy}
            disabled={!work || saving || effectiveAiBusy}
            label={aiLabel}
            progress={progress}
            onClick={handleAiActionClick}
          />
          <ThemeToggle className="h-10 w-10 shrink-0 rounded-xl bg-[var(--theme-surface-solid)] shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-[var(--theme-surface-solid)] hover:shadow-md hover:ring-[var(--theme-border)]" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <SaveStatusPill
            dirty={dirty}
            error={error}
            metaSaving={metaSaving}
            saving={saving}
            statusText={statusText}
            aiBusy={effectiveAiBusy}
            aiLabel={aiStageMessage}
            aiProgress={progress}
          />
          <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
            {userDisplayName || "创作者"}
          </span>
        </div>
      </div>
    </header>
  );
}

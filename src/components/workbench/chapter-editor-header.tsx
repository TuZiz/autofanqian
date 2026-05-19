import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
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
    userEmail,
    work,
    workId,
  } = editor;
  const nextChapterLabel = formatChapterLabel(
    Math.max(chapterIndex, maxChapterIndex) + 1,
    work?.workType,
  );
  const aiLabel = normalizeChapterCopy(effectiveAiBusy ? aiStageMessage : aiButtonLabel);
  const progress = Math.round(Math.max(0, Math.min(100, effectiveAiProgress)));

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-white/60 shadow-sm backdrop-blur-xl dark:border-[var(--theme-border)] dark:bg-zinc-950/60">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-12 items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Link
              href={workId ? `/dashboard/work/${workId}` : "/dashboard"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-[var(--theme-border)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-zinc-900 dark:ring-[var(--theme-border)] dark:hover:bg-zinc-800 dark:hover:ring-[var(--theme-border)]"
              title="返回作品面板"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" />
            </Link>

            <div className="hidden h-8 w-px bg-zinc-200/60 dark:bg-zinc-800/60 sm:block" />

            <ChapterEditorMenu editor={editor} nextChapterLabel={nextChapterLabel} />
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
            <span className="max-w-[120px] truncate text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {userEmail?.split("@")[0]}
            </span>
          </div>

          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-200/50 transition-all hover:bg-emerald-100 hover:ring-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20 dark:hover:bg-emerald-500/20 dark:hover:ring-emerald-500/30 sm:w-auto sm:gap-2 sm:px-4 sm:text-xs sm:font-semibold"
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
          <ThemeToggle className="h-10 w-10 shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-[var(--theme-border)] transition-all hover:bg-zinc-50 hover:shadow-md hover:ring-[var(--theme-border)] dark:bg-zinc-900 dark:ring-[var(--theme-border)] dark:hover:bg-zinc-800 dark:hover:ring-[var(--theme-border)]" />
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
          <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {userEmail?.split("@")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}

function formatChapterLabel(index: number, workType?: string | null) {
  if (isShortStoryWork(workType)) return `场景 ${Math.max(1, index)}`;
  return `第${Math.max(1, index)}章`;
}

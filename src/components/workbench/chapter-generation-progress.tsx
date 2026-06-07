import { Sparkles } from "lucide-react";

import type { ChapterGenerationSnapshot } from "@/lib/client/chapter-generation";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

export function ChapterGenerationTopbarProgress({
  generation,
}: {
  generation: ChapterGenerationSnapshot;
}) {
  const progress = Math.max(1, Math.min(99, Math.round(generation.progress)));
  const chapterLabel = formatChapterLabel(generation.index);
  const label = generation.message?.trim() || aiZhCN.chapterGenerate.stages.draft;

  return (
    <div
      className="w-full rounded-2xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] p-4 shadow-sm backdrop-blur-sm"
      role="progressbar"
      aria-label={`${chapterLabel} AI生成进度`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider">
        <span className="inline-flex min-w-0 items-center gap-3 text-[var(--theme-brand-text)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-surface-solid)] text-[var(--theme-brand-text)] shadow-sm ring-1 ring-[var(--theme-brand-border)]">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </span>
          <span className="truncate font-semibold">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-[var(--theme-brand-text)]/80">
          {chapterLabel} · {progress}%
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-surface-soft)] ring-1 ring-[var(--theme-brand-border)]">
        <div
          className="h-full rounded-full bg-[var(--theme-brand-500)] transition-all duration-300 ease-linear"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

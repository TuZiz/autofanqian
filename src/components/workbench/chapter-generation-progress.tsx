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
      className="w-full rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-sm backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-500/10"
      role="progressbar"
      aria-label={`${chapterLabel} AI生成进度`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider">
        <span className="inline-flex min-w-0 items-center gap-3 text-emerald-800 dark:text-emerald-200">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200/80 dark:bg-zinc-950 dark:text-emerald-400 dark:ring-emerald-500/20">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </span>
          <span className="truncate font-semibold">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-emerald-700/80 dark:text-emerald-300/80">
          {chapterLabel} · {progress}%
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-emerald-200/50 dark:bg-zinc-900/80 dark:ring-emerald-500/20">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300 ease-linear dark:bg-emerald-500"
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

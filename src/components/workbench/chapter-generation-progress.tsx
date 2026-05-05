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
      className="w-full rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 shadow-sm backdrop-blur-sm dark:border-blue-500/20 dark:bg-blue-500/10"
      role="progressbar"
      aria-label={`${chapterLabel} AI生成进度`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider">
        <span className="inline-flex min-w-0 items-center gap-3 text-blue-800 dark:text-blue-200">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-200/80 dark:bg-zinc-950 dark:text-blue-400 dark:ring-blue-500/20">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </span>
          <span className="truncate font-black">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-blue-700/80 dark:text-blue-300/80">
          {chapterLabel} · {progress}%
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-blue-200/50 dark:bg-zinc-900/80 dark:ring-blue-500/20">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-linear dark:bg-blue-500"
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

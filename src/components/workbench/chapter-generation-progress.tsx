import { Sparkles } from "lucide-react";

import type { ChapterGenerationSnapshot } from "@/lib/client/chapter-generation";

export function ChapterGenerationTopbarProgress({
  generation,
  copy,
  copyIndex,
}: {
  generation: ChapterGenerationSnapshot;
  copy: string;
  copyIndex: number;
}) {
  const progress = Math.max(1, Math.min(99, Math.round(generation.progress)));
  const chapterLabel = formatChapterLabel(generation.index);

  return (
    <div
      className="w-full rounded-xl border border-sky-200/70 bg-sky-50/85 px-3 py-2 shadow-sm ring-1 ring-white/70 dark:border-sky-300/15 dark:bg-sky-400/10 dark:ring-white/10"
      role="progressbar"
      aria-label={`${chapterLabel} AI生成进度`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-black">
        <span className="inline-flex min-w-0 items-center gap-2 text-sky-800 dark:text-sky-100">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 ring-1 ring-sky-200/80 dark:bg-white/[0.08] dark:text-sky-200 dark:ring-sky-300/20">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </span>
          <span
            key={copyIndex}
            className="truncate animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none"
          >
            {copy}
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-sky-700/75 dark:text-sky-200/75">
          {chapterLabel} · {progress}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-sky-200/50 dark:bg-white/10 dark:ring-white/10">
        <div
          className="h-full rounded-full bg-sky-600 transition-[width] duration-300 ease-linear animate-[ai-progress-shimmer_1.2s_linear_infinite] motion-reduce:animate-none"
          style={{
            width: `${progress}%`,
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </div>
  );
}

function formatChapterLabel(index: number) {
  return `第${Math.max(1, index)}章`;
}

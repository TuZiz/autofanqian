"use client";

import { AlertTriangle, BookOpen, FileText, Gauge } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ImportedNovelParseResult } from "@/lib/import/novel-import-parser";
import { cn } from "@/lib/utils";

export function ImportPreviewPanel({
  preview,
  singleLongImportWarning,
}: {
  preview: ImportedNovelParseResult | null;
  singleLongImportWarning: boolean;
}) {
  if (!preview) {
    return (
      <section className="flex min-h-[28rem] flex-col justify-center rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <FileText className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-[var(--theme-text-strong)]">
          等待解析预览
        </h2>
        <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-[var(--theme-text-secondary)]">
          粘贴正文或上传 TXT/Markdown 后，点击解析即可看到章节、字数和风险提示。
        </p>
      </section>
    );
  }

  const highSignalWarnings = preview.warnings.slice(0, 4);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] shadow-sm">
      <div className="border-b border-[var(--theme-border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
              Import Preview
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[var(--theme-text-strong)]">
              解析结果
            </h2>
          </div>
          <span
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold",
              singleLongImportWarning
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20",
            )}
          >
            {singleLongImportWarning ? "需确认" : "可导入"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric icon={BookOpen} label="章节" value={`${preview.chapters.length}`} />
          <Metric icon={Gauge} label="总字数" value={preview.totalWords.toLocaleString("zh-CN")} />
        </div>
      </div>

      {highSignalWarnings.length ? (
        <div className="border-b border-[var(--theme-border)] p-4">
          <div className="space-y-2">
            {highSignalWarnings.map((warning) => (
              <div
                key={warning}
                className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {preview.chapters.map((chapter) => (
            <article
              key={chapter.index}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
                    CH {chapter.index}
                  </div>
                  <h3 className="mt-1 truncate text-sm font-bold text-[var(--theme-text-strong)]">
                    {chapter.title}
                  </h3>
                </div>
                <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {chapter.wordCount.toLocaleString("zh-CN")} 字
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--theme-text-secondary)]">
                {chapter.content}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--theme-text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-black text-[var(--theme-text-strong)]">{value}</div>
    </div>
  );
}

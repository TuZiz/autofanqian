"use client";

import { BookOpen, Feather, Flag, Layers, Users } from "lucide-react";

import {
  buildShortStoryOutlineViewModel,
  type ShortStoryOutlineViewModel,
} from "@/lib/workbench/short-story-outline-view-model";
import { cn } from "@/lib/utils";

type ShortStoryOutlineViewProps = {
  className?: string;
  compact?: boolean;
  outline: unknown;
  rawOutline?: unknown;
  onOpenBeat?: (index: number) => void;
};

export function ShortStoryOutlineView({
  className,
  compact = false,
  outline,
  rawOutline,
  onOpenBeat,
}: ShortStoryOutlineViewProps) {
  const view = buildShortStoryOutlineViewModel(outline, rawOutline);

  return (
    <section className={cn("space-y-3", className)}>
      <ShortStoryOutlineSummary view={view} />

      {view.parseFailed ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm font-semibold leading-6 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          短篇结构数据不是标准 JSON，已降级展示可读摘要，不影响正文阅读、润色和导出。
        </div>
      ) : null}

      <div className={cn("grid gap-3", compact ? "lg:grid-cols-2" : "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="space-y-3">
          <InfoBlock
            icon={Feather}
            label="开篇钩子"
            value={view.hook || "暂无开篇钩子。"}
          />
          <InfoBlock
            icon={Flag}
            label="完整大纲"
            value={view.fullOutline || view.fallbackText || "暂无完整大纲。"}
            clamp={!compact}
          />
        </div>

        <div className="space-y-3">
          <InfoBlock
            icon={Users}
            label="角色"
            value={
              view.characters.length
                ? view.characters
                    .map((character) =>
                      `${character.name}（${character.role}）：${character.description || "暂无描述"}`,
                    )
                    .join("\n")
                : "暂无角色档案。"
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-inner">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--theme-text-strong)]">
            <Layers className="h-4 w-4 text-[var(--theme-brand-600)]" />
            结构 Beats
          </div>
          <span className="rounded-lg bg-[var(--theme-surface-strong)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
            {view.beats.length ? `${view.beats.length} 个节点` : "暂无节点"}
          </span>
        </div>

        {view.beats.length ? (
          <div className="divide-y divide-[var(--theme-border)]">
            {view.beats.map((beat) => (
              <article
                key={`${beat.index}-${beat.title}`}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--theme-surface-hover)] sm:grid-cols-[76px_minmax(0,1fr)_auto]"
              >
                <div className="flex h-8 w-fit items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-2.5 text-[11px] font-black text-[var(--theme-text-muted)]">
                  Beat {beat.index}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-[var(--theme-text-strong)]">{beat.title}</h4>
                    {beat.targetWords ? (
                      <span className="rounded-md bg-[var(--theme-surface-strong)] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-text-muted)]">
                        {beat.targetWords.toLocaleString("zh-CN")} 字
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
                    {beat.purpose || "暂无剧情目的。"}
                  </p>
                  {beat.writingPrompt ? (
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
                      {beat.writingPrompt}
                    </p>
                  ) : null}
                </div>
                {onOpenBeat ? (
                  <button
                    type="button"
                    onClick={() => onOpenBeat(beat.index)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 text-xs font-bold text-[var(--theme-text-secondary)] transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
                  >
                    查看正文
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm font-bold text-[var(--theme-text-muted)]">
            暂无 beats，可直接进入正文继续润色。
          </div>
        )}
      </div>
    </section>
  );
}

function ShortStoryOutlineSummary({ view }: { view: ShortStoryOutlineViewModel }) {
  const metrics = [
    { label: "主题", value: view.theme || "未提取" },
    { label: "结尾", value: view.endingLabel },
    {
      label: "字数",
      value: view.targetWords ? `${view.targetWords.toLocaleString("zh-CN")} 字` : "未设定",
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
            <BookOpen className="h-4 w-4 text-[var(--theme-brand-600)]" />
            短篇结构
          </div>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">
            {view.title || "一篇完结结构"}
          </h3>
          {view.synopsis ? (
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--theme-text-secondary)]">
              {view.synopsis}
            </p>
          ) : null}
        </div>
        {view.tag ? (
          <span className="rounded-lg bg-[var(--theme-brand-soft)] px-3 py-1 text-xs font-black text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
            {view.tag}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
              {item.label}
            </div>
            <div className="mt-1 truncate text-sm font-bold text-[var(--theme-text-strong)]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({
  clamp = false,
  icon: Icon,
  label,
  value,
}: {
  clamp?: boolean;
  icon: typeof Feather;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
        <Icon className="h-4 w-4 text-[var(--theme-brand-600)]" />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--theme-text-secondary)]",
          clamp && "line-clamp-8",
        )}
      >
        {value}
      </p>
    </div>
  );
}

"use client";

import { Clapperboard, FileText, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import type { ChapterRewriteAction } from "@/lib/workbench/use-chapter-editor-rewrite";
import { cn } from "@/lib/utils";

type ImplementedShortStoryAction = {
  action: ChapterRewriteAction;
  description: string;
  label: string;
  status: "ready";
};

type PendingShortStoryAction = {
  description: string;
  label: string;
  notice: string;
  status: "pending";
};

type ShortStoryAction = ImplementedShortStoryAction | PendingShortStoryAction;

const SHORT_STORY_ACTIONS: ShortStoryAction[] = [
  {
    action: "增强结尾追读感",
    description: "强化结尾爆点、余味和反转后的再钩子。",
    label: "增强反转",
    status: "ready",
  },
  {
    action: "fanqie_style",
    description: "复用章节改写能力，强化番茄阅读节奏。",
    label: "改成更番茄风",
    status: "ready",
  },
  {
    action: "compress",
    description: "先走压缩改写预览，再按 3000 字目标手动收束。",
    label: "压缩到 3000 字",
    status: "ready",
  },
  {
    action: "expand",
    description: "先走扩写改写预览，再按 8000 字目标继续补场景。",
    label: "扩写到 8000 字",
    status: "ready",
  },
  {
    description: "投稿简介生成接口正在接入中，本轮先保留入口。",
    label: "生成投稿简介",
    notice: "投稿简介生成正在接入中，当前不会消耗配额。",
    status: "pending",
  },
  {
    description: "短剧分镜会单独走结构化输出，接口正在接入中。",
    label: "生成短剧分镜",
    notice: "短剧分镜生成正在接入中，当前不会消耗配额。",
    status: "pending",
  },
];

export function ShortStoryActionPanel({ editor }: { editor: WorkChapterEditorController }) {
  const {
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    openFullChapterRewriteDialog,
    work,
  } = editor;
  const [pendingNotice, setPendingNotice] = useState("");
  const busy = rewriteBusy || rewriteApplying;

  function handleAction(action: ShortStoryAction) {
    if (action.status === "pending") {
      setPendingNotice(action.notice);
      return;
    }

    setPendingNotice("");
    openFullChapterRewriteDialog(action.action);
  }

  return (
    <section className="rounded-lg border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <WandSparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-brand-text)]" />
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[var(--theme-text-strong)]">
            短篇专属操作
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
            面向一篇完结正文：反转、番茄风、字数压缩扩写、投稿和短剧化。
          </p>
        </div>
      </div>

      {rewriteBlockedReason ? (
        <div className="mt-2 rounded-lg border border-[var(--theme-warning-border)]/70 bg-[var(--theme-warning-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--theme-warning-text)]">
          {rewriteBlockedReason}
        </div>
      ) : null}

      {pendingNotice ? (
        <div className="mt-2 rounded-lg border border-[var(--theme-info-border)]/70 bg-[var(--theme-info-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--theme-info-text)]">
          {pendingNotice}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SHORT_STORY_ACTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleAction(item)}
            disabled={!work || busy}
            title={item.description}
            className={cn(
              "group flex min-h-10 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
              item.status === "ready"
                ? "border-[var(--theme-brand-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-brand-text)] hover:bg-[var(--theme-brand-soft)] hover:shadow-sm/15"
                : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {busy && item.status === "ready" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : item.label.includes("分镜") ? (
                <Clapperboard className="h-3.5 w-3.5 shrink-0" />
              ) : item.label.includes("简介") ? (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate text-xs font-extrabold">{item.label}</span>
            </span>
            <span className="shrink-0 rounded-md bg-[var(--theme-surface-soft)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] opacity-75 ring-1 ring-black/5">
              {item.status === "ready" ? "可用" : "接入中"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

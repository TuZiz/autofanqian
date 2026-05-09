"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { useCreateOutlineRedirect } from "@/frontend/features/create/use-create-outline-redirect";

export default function DashboardCreateOutlineRedirectPage() {
  const outline = useCreateOutlineRedirect();

  return (
    <main className="theme-page relative min-h-screen overflow-hidden bg-[#faf9f6] font-sans transition-[background-color,color] dark:bg-[#1a1816]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <div className="relative z-10 min-h-screen">
        <DashboardTopbar
          title="作品工作台"
          userEmail={outline.userEmail}
          isAdmin={outline.isAdmin}
          showBackToDashboard
          backHref="/dashboard/create"
          backLabel="返回创意"
        />

        <OutlinePageSkeleton />
        <div className="absolute inset-0 z-[60] bg-white/55 backdrop-blur-md dark:bg-black/35" />
        <OutlineProgressDialog outline={outline} />
      </div>
    </main>
  );
}

function OutlinePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
      <div className="glass-panel rounded-lg p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="theme-chip rounded-md px-4 py-2 text-xs font-semibold">
            正在生成
          </span>
          <span className="theme-chip rounded-md px-4 py-2 text-xs font-semibold">
            请稍候
          </span>
          <span className="theme-chip-brand rounded-md px-4 py-2 text-xs font-semibold">
            大纲处理中
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-10 w-[min(720px,92%)] rounded-lg bg-stone-900/5 dark:bg-white/10" />
          <div className="h-4 w-[min(980px,96%)] rounded-md bg-stone-900/5 dark:bg-white/10" />
          <div className="h-4 w-[min(940px,90%)] rounded-md bg-stone-900/5 dark:bg-white/10" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="theme-card-soft rounded-lg p-6 lg:col-span-2">
            <div className="h-6 w-32 rounded-md bg-stone-900/5 dark:bg-white/10" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded-md bg-stone-900/5 dark:bg-white/10" />
              <div className="h-4 w-[92%] rounded-md bg-stone-900/5 dark:bg-white/10" />
              <div className="h-4 w-[88%] rounded-md bg-stone-900/5 dark:bg-white/10" />
            </div>
          </div>
          <div className="theme-card-soft rounded-lg p-6">
            <div className="h-6 w-24 rounded-md bg-stone-900/5 dark:bg-white/10" />
            <div className="mt-4 space-y-3">
              <div className="h-10 w-full rounded-lg bg-stone-900/5 dark:bg-white/10" />
              <div className="h-10 w-full rounded-lg bg-stone-900/5 dark:bg-white/10" />
              <div className="h-10 w-full rounded-lg bg-stone-900/5 dark:bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type OutlineProgressDialogProps = {
  outline: ReturnType<typeof useCreateOutlineRedirect>;
};

function OutlineProgressDialog({ outline }: OutlineProgressDialogProps) {
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center px-4 py-10">
      <div className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-lg p-8 text-center shadow-sm sm:p-10">
        {outline.stage === "done" || outline.stage === "error" ? null : (
          <>
            <span className="pointer-events-none absolute left-0 top-0 z-0 h-full w-1.5 bg-stone-900/5 dark:bg-white/10" />
            <span className="pointer-events-none absolute left-0 top-0 z-0 h-[45%] w-1.5 bg-emerald-500 animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
          </>
        )}

        <div className="relative z-10">
          <div className="mx-auto relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-stone-900 bg-stone-950 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:border-white dark:bg-white dark:text-stone-950">
            {outline.stage === "done" ? (
              <CheckCircle2 className="relative h-4 w-4" />
            ) : (
              <Sparkles className="relative h-4 w-4 animate-pulse" />
            )}
            <span className="relative">{outline.stage === "done" ? "完成" : "生成中"}</span>
          </div>

          <h1
            key={outline.stage}
            className="theme-heading mt-6 text-[clamp(2rem,3.2vw,2.8rem)] font-extrabold tracking-tight"
          >
            <span className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none">
              {outline.title}
            </span>
            {outline.stage === "done" || outline.stage === "error" ? null : (
              <span className="inline-block w-10 text-left tabular-nums">{outline.dots}</span>
            )}
          </h1>

          <p className="theme-subheading mt-4 text-sm leading-relaxed sm:text-base">
            {outline.error ? outline.error : outline.status}
          </p>

          <OutlineProgressBar outline={outline} />
          <OutlineStageList outline={outline} />
        </div>
      </div>
    </div>
  );
}

function OutlineProgressBar({ outline }: OutlineProgressDialogProps) {
  if (!outline.showProgress) return null;

  return (
    <div
      className="mx-auto mt-8 max-w-xl"
      role="progressbar"
      aria-label="AI 生成进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={outline.progressPercent}
    >
      <div className="theme-muted flex items-center justify-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-300" />
        <span
          key={outline.thinkingIndex}
          className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none"
        >
          {outline.thinkingCopy}
        </span>
      </div>
      <div className="relative mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-stone-200/70 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-linear motion-reduce:animate-none"
            style={{
              width: `${outline.progressValue}%`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-black/10 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-stone-900 shadow-sm backdrop-blur transition-[left] duration-300 ease-linear motion-reduce:transition-none dark:border-white/10 dark:bg-zinc-900/90 dark:text-white"
          style={{ left: `${outline.progressLabelLeft}%` }}
        >
          {outline.progressPercent}%
        </div>
      </div>
    </div>
  );
}

function OutlineStageList({ outline }: OutlineProgressDialogProps) {
  return (
    <div className="mx-auto mt-8 grid max-w-xl gap-2 text-left text-sm">
      <OutlineStageRow
        label="1. 生成大纲"
        state={
          outline.stage === "outline"
            ? "running"
            : outline.stage === "work" || outline.stage === "done"
              ? "done"
              : "error"
        }
      />
      <OutlineStageRow
        label="2. 创建作品"
        state={
          outline.stage === "work"
            ? "running"
            : outline.stage === "done"
              ? "done"
              : outline.stage === "outline"
                ? "waiting"
                : "error"
        }
      />

      {outline.stage === "error" ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="theme-button-secondary rounded-lg px-5 py-2 text-sm font-semibold"
            onClick={outline.handleBackToCreate}
          >
            返回创意页
          </button>
        </div>
      ) : null}
    </div>
  );
}

type OutlineStageState = "done" | "error" | "running" | "waiting";

function OutlineStageRow({
  label,
  state,
}: {
  label: string;
  state: OutlineStageState;
}) {
  const copy = {
    done: "已完成",
    error: "失败",
    running: "进行中",
    waiting: "等待中",
  }[state];

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 py-3">
      <span className="theme-heading font-semibold">{label}</span>
      <span
        className={
          state === "done"
            ? "theme-chip-brand rounded-md px-2.5 py-1 text-xs font-semibold"
            : "theme-chip rounded-md px-2.5 py-1 text-xs font-semibold"
        }
      >
        {copy}
      </span>
    </div>
  );
}

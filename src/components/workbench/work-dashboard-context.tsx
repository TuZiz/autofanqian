"use client";

import { Loader2, MapPinned, RefreshCw, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWorkDashboardContext } from "@/lib/workbench/use-work-dashboard-context";
import type { WorkDashboardController } from "@/lib/workbench/use-work-dashboard";
import { ContextCard } from "./work-dashboard-context-card";
import { ContextEditor } from "./work-dashboard-context-editor";

export function WorkDashboardContextPanel({ dashboard }: { dashboard: WorkDashboardController }) {
  const workId = dashboard.work?.id ?? "";
  const {
    editor,
    error,
    foreshadowings,
    loading,
    loadContext,
    openForeshadowing,
    openSetting,
    openTimeline,
    saveEditor,
    saving,
    setEditor,
    settings,
    timeline,
  } = useWorkDashboardContext(workId);

  return (
    <section className="app-compact-panel p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Context
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">伏笔设定</h2>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={loadContext}
          title="刷新数据"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 shadow-sm ring-1 ring-red-200/50 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
          {error}
        </div>
      ) : null}

      {loading && !foreshadowings.length && !settings.length && !timeline.length ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 p-8 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-zinc-400 dark:text-zinc-500" />
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            加载上下文数据...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <ContextCard
              title="待回收伏笔"
              icon={Route}
              items={foreshadowings}
              renderItem={(item) => (
                <div
                  key={item.id}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--theme-border)] bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50 dark:border-[var(--theme-border)] dark:bg-zinc-950/60 dark:hover:border-[var(--theme-border)] dark:hover:ring-[var(--theme-border)]/50"
                  onClick={() => openForeshadowing(item)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h4 className="truncate text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                      {item.title || "未命名伏笔"}
                    </h4>
                    <span className="shrink-0 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      第 {item.plantedChapter ?? "?"} 章
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-400">
                    {item.hint}
                  </p>
                </div>
              )}
              emptyText="暂无进行中的伏笔"
            />

            <ContextCard
              title="核心设定"
              icon={MapPinned}
              items={settings}
              renderItem={(item) => (
                <div
                  key={item.id}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--theme-border)] bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50 dark:border-[var(--theme-border)] dark:bg-zinc-950/60 dark:hover:border-[var(--theme-border)] dark:hover:ring-[var(--theme-border)]/50"
                  onClick={() => openSetting(item)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h4 className="truncate text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                      {item.name}
                    </h4>
                    <span className="shrink-0 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {item.kind || "通用设定"}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              )}
              emptyText="暂无作品设定档案"
            />
          </div>

          <ContextCard
            title="故事时间线"
            icon={Route}
            items={timeline}
            renderItem={(item) => (
              <div
                key={item.id}
                className="group relative flex cursor-pointer gap-5 pl-4 transition-all"
                onClick={() => openTimeline(item)}
              >
                <div className="absolute bottom-0 left-[27px] top-6 w-px bg-zinc-200/80 group-last:hidden dark:bg-zinc-800/80" />
                <div className="relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50 text-[10px] font-semibold text-emerald-700 shadow-sm ring-4 ring-white transition-all group-hover:scale-110 group-hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:ring-[var(--theme-border)] dark:group-hover:bg-emerald-500/30">
                  {item.chapterIndex || "?"}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-[var(--theme-border)] bg-white/60 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50 dark:border-[var(--theme-border)] dark:bg-zinc-950/60 dark:hover:border-[var(--theme-border)] dark:hover:ring-[var(--theme-border)]/50">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="truncate text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                      {item.title || "时间线事件"}
                    </h4>
                    {item.storyTime ? (
                      <span className="text-[11px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400">
                        {item.storyTime}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-zinc-600 dark:text-zinc-400">
                    {item.summary}
                  </p>
                </div>
              </div>
            )}
            emptyText="暂无时间线事件"
          />
        </div>
      )}

      {editor ? (
        <ContextEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
          saving={saving}
          setEditor={setEditor}
        />
      ) : null}
    </section>
  );
}

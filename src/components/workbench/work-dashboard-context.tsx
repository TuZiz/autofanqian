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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] shadow-inner ring-1 ring-[var(--theme-brand-border)]">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)]">
              Context
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--theme-text-strong)]">伏笔设定</h2>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={loadContext}
          title="刷新数据"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-secondary)] shadow-sm transition-all hover:bg-[var(--theme-surface-solid)] hover:text-[var(--theme-text-strong)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl bg-[var(--theme-danger-soft)] p-4 text-sm font-bold text-[var(--theme-danger-text)] shadow-sm ring-1 ring-[var(--theme-danger-border)]">
          {error}
        </div>
      ) : null}

      {loading && !foreshadowings.length && !settings.length && !timeline.length ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-8 shadow-inner">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--theme-text-muted)]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
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
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50"
                  onClick={() => openForeshadowing(item)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h4 className="truncate text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
                      {item.title || "未命名伏笔"}
                    </h4>
                    <span className="shrink-0 rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-brand-text)] shadow-sm">
                      第 {item.plantedChapter ?? "?"} 章
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-[var(--theme-text-secondary)]">
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
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50"
                  onClick={() => openSetting(item)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h4 className="truncate text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
                      {item.name}
                    </h4>
                    <span className="shrink-0 rounded-xl border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-brand-text)] shadow-sm">
                      {item.kind || "通用设定"}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-[var(--theme-text-secondary)]">
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
                <div className="absolute bottom-0 left-[27px] top-6 w-px bg-[var(--theme-border)]/80 group-last:hidden" />
                <div className="relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[10px] font-semibold text-[var(--theme-brand-text)] shadow-sm ring-4 ring-white transition-all group-hover:scale-110 group-hover:bg-[var(--theme-brand-soft)]">
                  {item.chapterIndex || "?"}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--theme-border)] hover:shadow-md hover:ring-1 hover:ring-[var(--theme-border)]/50">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="truncate text-base font-bold tracking-tight text-[var(--theme-text-strong)]">
                      {item.title || "时间线事件"}
                    </h4>
                    {item.storyTime ? (
                      <span className="text-[11px] font-bold tracking-widest text-[var(--theme-text-muted)]">
                        {item.storyTime}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-7 text-[var(--theme-text-secondary)]">
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

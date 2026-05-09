"use client";

import {
  AlertCircle,
  Clock3,
  FileText,
  History,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { ChapterDetail } from "@/lib/workbench/chapter-editor-types";
import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";

type ChapterRevisionListItem = {
  id: string;
  index: number;
  title: string | null;
  wordCount: number;
  source: string;
  reason: string | null;
  createdAt: string;
};

type ChapterRevisionDetail = ChapterRevisionListItem & {
  content: string;
  summary: string | null;
  chapterOutline: string | null;
  details: unknown;
};

type RevisionListResponse = {
  revisions: ChapterRevisionListItem[];
};

type RevisionDetailResponse = {
  revision: ChapterRevisionDetail;
};

type RevisionRestoreResponse = {
  chapter: ChapterDetail;
};

const sourceLabelMap: Record<string, string> = {
  ai_generate: "AI 生成前",
  ai_regenerate: "重新生成前",
  ai_rewrite: "AI 改写前",
  manual_save: "正式保存前",
  meta_update: "元数据更新前",
  restore_before: "恢复前备份",
};

export function ChapterRevisionDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    chapterIndex,
    handleRevisionRestored,
    revisionDialogOpen,
    setRevisionDialogOpen,
    workId,
  } = editor;
  const [revisions, setRevisions] = useState<ChapterRevisionListItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<ChapterRevisionDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  const selectedSummary = useMemo(() => {
    if (!selectedRevision) return "";
    return [
      selectedRevision.summary,
      selectedRevision.chapterOutline,
      normalizeDetails(selectedRevision.details).join("；"),
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [selectedRevision]);

  const loadRevisionDetail = useCallback(
    async (revisionId: string) => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) return;

      setLoadingDetail(true);
      setError("");
      const res = await apiRequest<RevisionDetailResponse>(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/revisions/${encodeURIComponent(revisionId)}`,
        undefined,
        { method: "GET" },
      );
      setLoadingDetail(false);

      if (!res.success || !res.data?.revision) {
        setError(res.message || "加载历史版本失败。");
        return;
      }

      setSelectedRevision(res.data.revision);
    },
    [chapterIndex, workId],
  );

  useEffect(() => {
    if (!revisionDialogOpen) return;

    let active = true;

    async function loadRevisions() {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) return;

      setLoadingList(true);
      setSelectedRevision(null);
      setError("");
      const res = await apiRequest<RevisionListResponse>(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/revisions`,
        undefined,
        { method: "GET" },
      );

      if (!active) return;
      setLoadingList(false);

      if (!res.success || !res.data?.revisions) {
        setError(res.message || "加载历史版本失败。");
        setRevisions([]);
        return;
      }

      setRevisions(res.data.revisions);
      if (res.data.revisions[0]) {
        await loadRevisionDetail(res.data.revisions[0].id);
      }
    }

    void loadRevisions();
    return () => {
      active = false;
    };
  }, [chapterIndex, loadRevisionDetail, revisionDialogOpen, workId]);

  if (!revisionDialogOpen) return null;

  const closeDialog = () => {
    if (restoring) return;
    setRevisionDialogOpen(false);
  };

  const restoreRevision = async () => {
    if (!selectedRevision || restoring) return;
    const confirmed = window.confirm(
      "确定恢复这个历史版本吗？当前正文会先保存为新的历史版本，方便你再撤回。",
    );
    if (!confirmed) return;

    setRestoring(true);
    setError("");
    const res = await apiRequest<RevisionRestoreResponse>(
      `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/revisions/${encodeURIComponent(selectedRevision.id)}/restore`,
      undefined,
      { method: "POST" },
    );
    setRestoring(false);

    if (!res.success || !res.data?.chapter) {
      setError(res.message || "恢复历史版本失败。");
      return;
    }

    handleRevisionRestored(res.data.chapter);
    setRevisionDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="关闭历史版本弹窗"
        disabled={restoring}
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-sm disabled:cursor-wait"
        onClick={closeDialog}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-revisions-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-5xl animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface-solid)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] bg-white/50 px-6 py-5 dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Chapter Revision
              </p>
              <h3
                id="chapter-revisions-title"
                className="mt-1 truncate text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
              >
                第{chapterIndex}章修订历史
              </h3>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                每次正式保存、AI 覆盖或恢复前都会留下快照，可预览后恢复。
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            disabled={restoring}
            onClick={closeDialog}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 hover:ring-1 hover:ring-[var(--theme-border)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--theme-border)] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white dark:hover:ring-[var(--theme-border)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {error ? (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/20 sm:mx-6">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="min-h-0 border-b border-[var(--theme-border)] p-5 dark:border-[var(--theme-border)] md:border-b-0 md:border-r sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                版本列表
              </span>
              <span className="rounded-lg bg-zinc-100/80 px-2 py-0.5 text-[11px] font-bold text-zinc-500 shadow-sm dark:bg-zinc-800/80 dark:text-zinc-400">
                {revisions.length} 条
              </span>
            </div>

            <div className="max-h-[24vh] space-y-3 overflow-y-auto pr-2 md:max-h-[58vh]">
              {loadingList ? (
                <LoadingState label="正在读取历史版本..." />
              ) : revisions.length ? (
                revisions.map((revision) => (
                  <button
                    key={revision.id}
                    type="button"
                    onClick={() => void loadRevisionDetail(revision.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                      selectedRevision?.id === revision.id
                        ? "border-emerald-300/80 bg-emerald-50/80 text-zinc-950 shadow-md ring-1 ring-emerald-300/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-zinc-50 dark:ring-emerald-500/20"
                        : "border-[var(--theme-border)] bg-white/80 text-zinc-700 shadow-sm hover:border-[var(--theme-border)] hover:bg-zinc-50/80 hover:shadow dark:border-[var(--theme-border)] dark:bg-zinc-950/80 dark:text-zinc-300 dark:hover:border-[var(--theme-border)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">
                        {sourceLabel(revision.source)}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
                        {revision.wordCount.toLocaleString("zh-CN")} 字
                      </span>
                    </div>
                    <div className="mt-1.5 truncate text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {revision.title || `第${revision.index}章`}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(revision.createdAt)}
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col p-5 sm:p-6">
            {loadingDetail ? (
              <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-white/50 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
                <LoadingState label="正在载入版本内容..." />
              </div>
            ) : selectedRevision ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="truncate text-xl font-extrabold text-zinc-950 dark:text-white">
                      {selectedRevision.title || `第${selectedRevision.index}章`}
                    </h4>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {sourceLabel(selectedRevision.source)} · {formatDateTime(selectedRevision.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={() => void restoreRevision()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  >
                    {restoring ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    恢复此版本
                  </button>
                </div>

                {selectedSummary ? (
                  <div className="mb-4 rounded-2xl border border-[var(--theme-border)] bg-zinc-50/80 px-5 py-4 text-sm font-medium leading-relaxed text-zinc-600 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-900/80 dark:text-zinc-300">
                    <div className="mb-2 flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
                      <FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                      摘要 / 大纲 / 细节
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap">{selectedSummary}</p>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-[var(--theme-border)] bg-white/80 px-6 py-6 shadow-inner dark:border-[var(--theme-border)] dark:bg-zinc-950/80">
                  {selectedRevision.content.trim() ? (
                    <div className="whitespace-pre-wrap break-words text-[15px] font-medium leading-8 text-zinc-800 dark:text-zinc-100">
                      {selectedRevision.content}
                    </div>
                  ) : (
                    <div className="flex min-h-[16rem] items-center justify-center text-sm font-bold text-zinc-500 dark:text-zinc-400">
                      这个历史版本没有正文内容。
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[22rem] items-center justify-center rounded-3xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 text-sm font-bold text-zinc-500 dark:border-[var(--theme-border)] dark:bg-zinc-900/50 dark:text-zinc-400">
                选择左侧历史版本后查看正文。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function sourceLabel(source: string) {
  return sourceLabelMap[source] ?? source;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeDetails(details: unknown) {
  if (!Array.isArray(details)) return [];
  return details
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm font-bold text-zinc-500 dark:text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--theme-border)] bg-zinc-50/50 px-5 py-10 text-center dark:border-[var(--theme-border)] dark:bg-zinc-900/50">
      <History className="mx-auto mb-4 h-6 w-6 text-zinc-400 dark:text-zinc-500" />
      <p className="text-sm font-bold text-zinc-950 dark:text-white">还没有历史版本</p>
      <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-500 dark:text-zinc-400">
        第二次正式保存、AI 覆盖或恢复前，系统会自动记录上一版。
      </p>
    </div>
  );
}

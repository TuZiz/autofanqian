"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import { toChapterListItem } from "./chapter-editor-format";
import type {
  ChapterBootstrap,
  ChapterDetail,
  ChapterListItem,
  ChapterOverview,
  WorkLite,
} from "./chapter-editor-types";

type UseChapterEditorNavigationParams = {
  chapter: ChapterDetail | null;
  chapterIndex: number;
  wordCount: number;
  work: WorkLite | null;
  workId: string;
};

export const BATCH_CHAPTER_COUNT_REQUEST_EVENT =
  "workbench:batch-chapter-count-request";

export type BatchChapterCountRequest = {
  defaultCount: number;
  id: string;
  max: number;
  min: number;
  startIndex: number;
};

const batchChapterCountResolvers = new Map<string, (count: number | null) => void>();

export function resolveBatchChapterCount(id: string, count: number | null) {
  const resolve = batchChapterCountResolvers.get(id);
  if (!resolve) return;
  batchChapterCountResolvers.delete(id);
  resolve(count);
}

function formatChapterLabel(index: number) {
  return `第${index}章`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function requestBatchChapterCount(detail: Omit<BatchChapterCountRequest, "id">) {
  if (typeof window === "undefined") return Promise.resolve<number | null>(null);

  const id = `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise<number | null>((resolve) => {
    batchChapterCountResolvers.set(id, resolve);
    window.dispatchEvent(
      new CustomEvent<BatchChapterCountRequest>(BATCH_CHAPTER_COUNT_REQUEST_EVENT, {
        detail: {
          ...detail,
          id,
        },
      }),
    );
  });
}

export function useChapterEditorNavigation({
  chapter,
  chapterIndex,
  wordCount,
  work,
  workId,
}: UseChapterEditorNavigationParams) {
  const router = useRouter();
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [chapterMenuFocusNonce, setChapterMenuFocusNonce] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [maxChapterIndex, setMaxChapterIndex] = useState(0);

  const mergeChapterListItem = useCallback((nextChapter: ChapterDetail) => {
    const nextItem = toChapterListItem(nextChapter);
    setChapters((prev) => {
      const exists = prev.some((item) => item.index === nextItem.index);
      const merged = exists
        ? prev.map((item) => (item.index === nextItem.index ? nextItem : item))
        : [...prev, nextItem];
      return merged.sort((left, right) => left.index - right.index);
    });
    setMaxChapterIndex((current) => Math.max(current, nextChapter.index));
  }, []);

  const applyChapterOverview = useCallback((overview: ChapterOverview) => {
    setChapters(overview.chapters);
    setMaxChapterIndex(Math.max(0, overview.maxIndex || 0));
  }, []);

  const chapterList = useMemo(() => {
    const base = chapters.slice();
    if (chapter && !base.some((item) => item.index === chapter.index)) {
      base.push(toChapterListItem(chapter));
    }
    return base.sort((left, right) => left.index - right.index);
  }, [chapter, chapters]);

  const commandChapters = useMemo(() => {
    const query = normalizeSearchText(commandQuery);
    return chapterList
      .filter((item) => {
        if (!query) return true;
        const searchable = normalizeSearchText(
          [
            String(item.index),
            formatChapterLabel(item.index),
            item.title ?? "",
            work?.title ?? "",
          ].join(" "),
        );
        return searchable.includes(query);
      });
  }, [chapterList, commandQuery, work?.title]);

  const requestChapterMenuSearchFocus = useCallback(() => {
    setChapterMenuFocusNonce((current) => current + 1);
  }, []);

  const goToChapter = useCallback(
    async (targetIndex: number, options?: { autoAi?: boolean }) => {
      if (!workId || !Number.isFinite(targetIndex) || targetIndex <= 0) return;
      const href = `/dashboard/work/${workId}/chapter/${targetIndex}${options?.autoAi ? "?ai=1" : ""}`;
      router.push(href);
      window.setTimeout(() => {
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== href) window.location.assign(href);
      }, 250);
    },
    [router, workId],
  );

  const handleBatchAddChapters = useCallback(async () => {
    if (!workId) return;

    const startIndex = Math.max(maxChapterIndex, chapterIndex) + 1;
    const requestedCount = await requestBatchChapterCount({
      defaultCount: 5,
      max: 20,
      min: 1,
      startIndex,
    });
    if (requestedCount === null) return;

    const count = Math.max(1, Math.min(20, Math.trunc(requestedCount)));
    if (!count) return;

    const results = await Promise.all(
      Array.from({ length: count }, (_, offset) =>
        apiRequest<ChapterBootstrap>(
          `/api/works/${encodeURIComponent(workId)}/chapters/${startIndex + offset}`,
          undefined,
          { method: "GET" },
        ),
      ),
    );
    const created = results
      .map((result) => result.data?.chapter)
      .filter((item): item is ChapterDetail => Boolean(item));
    setChapters((prev) => {
      const byIndex = new Map(prev.map((item) => [item.index, item]));
      created.forEach((item) => byIndex.set(item.index, toChapterListItem(item)));
      return Array.from(byIndex.values()).sort((a, b) => a.index - b.index);
    });
    setMaxChapterIndex((current) => Math.max(current, startIndex + count - 1));
  }, [chapterIndex, maxChapterIndex, workId]);

  const chapterLabel = formatChapterLabel(chapterIndex);
  const chapterMenuVolumeLabel = chapterList.length
    ? `全部章节（${chapterList.length}章）`
    : "全部章节";
  const chapterMenuChapters = commandChapters;
  const currentChapterItem = chapterList.find((item) => item.index === chapterIndex);
  const currentChapterEdited = Boolean((currentChapterItem?.wordCount ?? wordCount) > 0);

  return {
    applyChapterOverview,
    chapterLabel,
    chapterList,
    chapterMenuFocusNonce,
    chapterMenuChapters,
    chapterMenuOpen,
    chapterMenuVolumeLabel,
    commandChapters,
    commandOpen,
    commandQuery,
    currentChapterEdited,
    goToChapter,
    handleBatchAddChapters,
    maxChapterIndex,
    mergeChapterListItem,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
  };
}

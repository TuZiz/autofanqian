"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { ChapterBootstrap } from "./chapter-editor-types";

function clearTimer(ref: MutableRefObject<number | null>) {
  if (!ref.current) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}

export function useChapterEditorSave(params: {
  applyBootstrap: (payload: ChapterBootstrap) => void;
  applyMetaFromChapter: (chapter: ChapterBootstrap["chapter"]) => void;
  chapterIndex: number;
  content: string;
  mergeChapterListItem: (chapter: ChapterBootstrap["chapter"]) => void;
  setError: (message: string) => void;
  setContent: (value: string) => void;
  setTitle: (value: string) => void;
  title: string;
  workId: string;
}) {
  const {
    applyBootstrap,
    applyMetaFromChapter,
    chapterIndex,
    content,
    mergeChapterListItem,
    setContent,
    setError,
    setTitle,
    title,
    workId,
  } = params;
  const [dirty, setDirty] = useState(false);
  const [draftUnsynced, setDraftUnsynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const draftSavingRef = useRef(false);

  const saveNow = useCallback(
    async (next?: { title?: string; content?: string }) => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0 || saving) {
        return;
      }

      setSaving(true);
      const res = await apiRequest<ChapterBootstrap>(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}`,
        {
          title: next?.title ?? title,
          content: next?.content ?? content,
        },
        { method: "PUT" },
      );
      setSaving(false);

      if (!res.success || !res.data?.chapter) {
        setError(res.message || "保存失败");
        return;
      }

      applyBootstrap(res.data);
      applyMetaFromChapter(res.data.chapter);
      mergeChapterListItem(res.data.chapter);
      setDraftUnsynced(false);
      await apiRequest(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/draft`,
        undefined,
        { method: "DELETE" },
      );
    },
    [
      applyBootstrap,
      applyMetaFromChapter,
      chapterIndex,
      content,
      mergeChapterListItem,
      saving,
      setError,
      title,
      workId,
    ],
  );

  const saveDraft = useCallback(
    async (next?: { title?: string; content?: string }) => {
      if (
        !workId ||
        !Number.isFinite(chapterIndex) ||
        chapterIndex <= 0 ||
        draftSavingRef.current
      ) {
        return;
      }

      draftSavingRef.current = true;
      setDraftSaving(true);
      try {
        const res = await apiRequest(
          `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/draft`,
          {
            title: next?.title ?? title,
            content: next?.content ?? content,
          },
          { method: "PUT" },
        );

        if (!res.success) {
          setError(res.message || "草稿保存失败");
          return;
        }

        setDirty(false);
        setDraftUnsynced(true);
      } finally {
        draftSavingRef.current = false;
        setDraftSaving(false);
      }
    },
    [chapterIndex, content, setError, title, workId],
  );

  const scheduleSave = useCallback(
    (next?: { title?: string; content?: string }) => {
      clearTimer(saveTimerRef);
      setDirty(true);
      setDraftUnsynced(true);
      saveTimerRef.current = window.setTimeout(() => void saveDraft(next), 850);
    },
    [saveDraft, setDraftUnsynced],
  );

  const updateTitle = useCallback(
    (value: string) => {
      const next = value.slice(0, 120);
      setTitle(next);
      scheduleSave({ title: next });
    },
    [scheduleSave, setTitle],
  );

  const updateContent = useCallback(
    (value: string) => {
      const next = value.slice(0, 200_000);
      setContent(next);
      scheduleSave({ content: next });
    },
    [scheduleSave, setContent],
  );

  useEffect(() => () => clearTimer(saveTimerRef), []);

  return {
    dirty,
    draftSaving,
    draftUnsynced,
    saveNow,
    saving,
    setDirty,
    setDraftUnsynced,
    updateContent,
    updateTitle,
  };
}

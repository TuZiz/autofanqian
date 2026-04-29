"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  startChapterGeneration,
  useChapterGeneration,
  useChapterGenerationThinkingCopy,
} from "@/lib/client/chapter-generation";
import { apiRequest } from "@/lib/client/auth-api";

import type {
  ChapterBootstrap,
  ChapterDetail,
  ChapterListItem,
} from "./chapter-editor-types";

type UseChapterEditorAiParams = {
  applyBootstrap: (payload: ChapterBootstrap) => void;
  applyMetaFromChapter: (chapter: ChapterDetail) => void;
  autoAi: boolean;
  bootstrapLoading: boolean;
  chapterIndex: number;
  chapterList: ChapterListItem[];
  content: string;
  dirty: boolean;
  mergeChapterListItem: (chapter: ChapterDetail) => void;
  saving: boolean;
  setError: (message: string) => void;
  workId: string;
};

function getBlockingPreviousChapterIndex(
  chapterIndex: number,
  chapterList: ChapterListItem[],
) {
  if (!Number.isFinite(chapterIndex) || chapterIndex <= 1) return null;

  const blockingChapter = chapterList
    .filter((chapter) => chapter.index < chapterIndex)
    .filter((chapter) => (chapter.wordCount ?? 0) <= 0)
    .sort((left, right) => right.index - left.index)[0];

  return blockingChapter?.index ?? null;
}

function getBlockedGenerationMessage(blockingChapterIndex: number, chapterIndex: number) {
  return `请先完成第${blockingChapterIndex}章正文后，再生成第${chapterIndex}章。`;
}

export function useChapterEditorAi({
  applyBootstrap,
  applyMetaFromChapter,
  autoAi,
  bootstrapLoading,
  chapterIndex,
  chapterList,
  content,
  dirty,
  mergeChapterListItem,
  saving,
  setError,
  workId,
}: UseChapterEditorAiParams) {
  const router = useRouter();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const autoAiTriggeredRef = useRef(false);
  const appliedGenerationRef = useRef("");

  const chapterGeneration = useChapterGeneration(workId, chapterIndex);
  const sharedAiBusy = chapterGeneration?.status === "running";
  const effectiveAiBusy = aiBusy || sharedAiBusy;
  const effectiveAiProgress = Math.max(
    aiProgress,
    sharedAiBusy ? chapterGeneration?.progress ?? 0 : 0,
  );
  const aiThinking = useChapterGenerationThinkingCopy(effectiveAiBusy);
  const hasExistingDraft = useMemo(() => Boolean((content ?? "").trim()), [content]);
  const blockingPreviousChapterIndex = useMemo(
    () => getBlockingPreviousChapterIndex(chapterIndex, chapterList),
    [chapterIndex, chapterList],
  );
  const blockedGenerationMessage = useMemo(
    () =>
      blockingPreviousChapterIndex
        ? getBlockedGenerationMessage(blockingPreviousChapterIndex, chapterIndex)
        : "",
    [blockingPreviousChapterIndex, chapterIndex],
  );

  const handleGenerateWithAi = useCallback(
    async (extraPrompt = "") => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) return;
      if (effectiveAiBusy || saving) return;
      if (blockedGenerationMessage) {
        window.alert(blockedGenerationMessage);
        setError(blockedGenerationMessage);
        return;
      }

      setAiBusy(true);
      setAiProgress(8);
      try {
        const res = await startChapterGeneration({ workId, index: chapterIndex, extraPrompt });
        if (!res.success || !res.data?.chapter) {
          const message =
            res.status === 409
              ? "该章节正在生成中，请等待生成结束后再操作。"
              : res.message || "AI 生成失败，请稍后重试。";
          if (res.status !== 409) window.alert(message);
          setError(message);
          return;
        }

        applyBootstrap(res.data);
        applyMetaFromChapter(res.data.chapter);
        mergeChapterListItem(res.data.chapter);
        setRegenerateOpen(false);
        setRegeneratePrompt("");
        setError("");
      } finally {
        setAiBusy(false);
        setAiProgress(0);
      }
    },
    [
      applyBootstrap,
      applyMetaFromChapter,
      blockedGenerationMessage,
      chapterIndex,
      effectiveAiBusy,
      mergeChapterListItem,
      saving,
      setError,
      workId,
    ],
  );

  const aiButtonLabel = useMemo(() => {
    if (effectiveAiBusy) return aiThinking.copy;
    if (blockingPreviousChapterIndex) return `先补第${blockingPreviousChapterIndex}章`;
    if (hasExistingDraft) return chapterIndex === 1 ? "重新生成第1章" : "重新生成本章";
    return chapterIndex === 1 ? "AI 生成第1章" : "AI 生成本章";
  }, [
    aiThinking.copy,
    blockingPreviousChapterIndex,
    chapterIndex,
    effectiveAiBusy,
    hasExistingDraft,
  ]);

  const handleAiActionClick = useCallback(() => {
    if (effectiveAiBusy || saving) return;
    if (blockedGenerationMessage) {
      window.alert(blockedGenerationMessage);
      setError(blockedGenerationMessage);
      return;
    }
    if (!hasExistingDraft) {
      setRegeneratePrompt("");
      void handleGenerateWithAi("");
      return;
    }
    setRegeneratePrompt("");
    setRegenerateOpen(true);
  }, [
    blockedGenerationMessage,
    effectiveAiBusy,
    handleGenerateWithAi,
    hasExistingDraft,
    saving,
    setError,
  ]);

  const handleConfirmRegenerate = useCallback(() => {
    const prompt = regeneratePrompt;
    setRegenerateOpen(false);
    setRegeneratePrompt("");
    void handleGenerateWithAi(prompt);
  }, [handleGenerateWithAi, regeneratePrompt]);

  useEffect(() => {
    if (!autoAi || bootstrapLoading || !workId || autoAiTriggeredRef.current) return;
    if (dirty || saving || effectiveAiBusy || content.trim()) return;
    autoAiTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      if (blockedGenerationMessage) {
        window.alert(blockedGenerationMessage);
        setError(blockedGenerationMessage);
      } else {
        void handleGenerateWithAi("");
      }
      router.replace(`/dashboard/work/${workId}/chapter/${chapterIndex}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    autoAi,
    blockedGenerationMessage,
    bootstrapLoading,
    chapterIndex,
    content,
    dirty,
    effectiveAiBusy,
    handleGenerateWithAi,
    router,
    saving,
    setError,
    workId,
  ]);

  useEffect(() => {
    if (chapterGeneration?.status !== "done") return;
    const appliedKey = `${chapterGeneration.key}:${chapterGeneration.updatedAt}`;
    if (appliedGenerationRef.current === appliedKey) return;
    appliedGenerationRef.current = appliedKey;

    let cancelled = false;
    async function refreshGeneratedChapter() {
      const res = await apiRequest<ChapterBootstrap>(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}`,
        undefined,
        { method: "GET" },
      );
      if (!cancelled && res.success && res.data?.chapter) {
        applyBootstrap(res.data);
        applyMetaFromChapter(res.data.chapter);
        mergeChapterListItem(res.data.chapter);
      }
    }
    void refreshGeneratedChapter();
    return () => {
      cancelled = true;
    };
  }, [
    applyBootstrap,
    applyMetaFromChapter,
    chapterGeneration,
    chapterIndex,
    mergeChapterListItem,
    workId,
  ]);

  return {
    aiButtonLabel,
    aiThinking,
    effectiveAiBusy,
    effectiveAiProgress,
    handleAiActionClick,
    handleConfirmRegenerate,
    regenerateOpen,
    regeneratePrompt,
    setRegenerateOpen,
    setRegeneratePrompt,
    sharedAiBusy,
  };
}

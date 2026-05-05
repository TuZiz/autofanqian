"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  startChapterGeneration,
  useChapterGeneration,
  useChapterGenerationThinkingCopy,
} from "@/lib/client/chapter-generation";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

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
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const autoAiTriggeredRef = useRef(false);
  const appliedGenerationRef = useRef("");

  const chapterGeneration = useChapterGeneration(workId, chapterIndex);
  const sharedAiBusy = chapterGeneration?.status === "running";
  const effectiveAiBusy = sharedAiBusy;
  const effectiveAiProgress = Math.max(0, chapterGeneration?.progress ?? 0);
  const aiThinking = useChapterGenerationThinkingCopy(chapterGeneration);
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

      const res = await startChapterGeneration({ workId, index: chapterIndex, extraPrompt });
      if (!res.success) {
        const message = res.message || aiZhCN.chapterGenerate.failed;
        window.alert(message);
        setError(message);
        return;
      }

      setRegenerateOpen(false);
      setRegeneratePrompt("");
      setError("");
    },
    [
      blockedGenerationMessage,
      chapterIndex,
      effectiveAiBusy,
      saving,
      setError,
      workId,
    ],
  );

  const aiButtonLabel = useMemo(() => {
    if (effectiveAiBusy) return aiThinking.copy;
    if (blockingPreviousChapterIndex) {
      return aiZhCN.chapterGenerate.blockedPrevious(blockingPreviousChapterIndex);
    }
    if (hasExistingDraft) {
      return aiZhCN.chapterGenerate.regenerateButton(chapterIndex);
    }
    return aiZhCN.chapterGenerate.generateButton(chapterIndex);
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
    if (dirty || saving || effectiveAiBusy || (content ?? "").trim()) return;
    autoAiTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      if (blockedGenerationMessage) {
        window.alert(blockedGenerationMessage);
        setError(blockedGenerationMessage);
      } else {
        void handleGenerateWithAi("");
      }
      router.replace(`/dashboard/novel/${workId}/chapter/${chapterIndex}`);
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
    if (chapterGeneration?.status !== "done" || !chapterGeneration.result) return;
    const result = chapterGeneration.result;
    const appliedKey = `${chapterGeneration.key}:${result.chapter.updatedAt}`;
    if (appliedGenerationRef.current === appliedKey) return;
    appliedGenerationRef.current = appliedKey;

    const bootstrapPayload: ChapterBootstrap = {
      work: result.work,
      chapter: {
        ...result.chapter,
        details: Array.isArray(result.chapter.details) ? result.chapter.details : [],
      },
    };
    applyBootstrap(bootstrapPayload);
    applyMetaFromChapter(bootstrapPayload.chapter);
    mergeChapterListItem(bootstrapPayload.chapter);
    setError("");
  }, [
    applyBootstrap,
    applyMetaFromChapter,
    chapterGeneration,
    mergeChapterListItem,
    setError,
  ]);

  useEffect(() => {
    if (chapterGeneration?.status !== "error") return;
    if (chapterGeneration.error) {
      setError(chapterGeneration.error);
    }
  }, [chapterGeneration, setError]);

  return {
    aiButtonLabel,
    aiThinking,
    aiStageMessage: chapterGeneration?.message || aiThinking.copy,
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

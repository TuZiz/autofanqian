"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import {
  countWords,
  formatTime,
  normalizeChapterDraft,
} from "./chapter-editor-format";
import type {
  ChapterBootstrap,
  ChapterDetail,
  WorkLite,
} from "./chapter-editor-types";
import { useChapterEditorAi } from "./use-chapter-editor-ai";
import { useChapterEditorBootstrap } from "./use-chapter-editor-bootstrap";
import { useChapterEditorClipboard } from "./use-chapter-editor-clipboard";
import { useChapterEditorMeta } from "./use-chapter-editor-meta";
import { useChapterEditorNavigation } from "./use-chapter-editor-navigation";
import { useChapterEditorRewrite } from "./use-chapter-editor-rewrite";
import { useChapterEditorSave } from "./use-chapter-editor-save";
import { useChapterEditorShortcuts } from "./use-chapter-editor-shortcuts";
import { useChapterConsistency } from "./use-chapter-consistency";

export function useWorkChapterEditor(params: {
  autoAi: boolean;
  chapterIndex: number;
  workId: string;
}) {
  const { autoAi, chapterIndex, workId } = params;

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [work, setWork] = useState<WorkLite | null>(null);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const applyMetaFromChapterRef = useRef<((chapter: ChapterDetail) => void) | null>(null);

  const wordCount = useMemo(() => countWords(content), [content]);

  const applyBootstrap = useCallback((payload: ChapterBootstrap) => {
    const normalized = normalizeChapterDraft(payload.chapter);
    setWork(payload.work);
    setChapter(payload.chapter);
    setTitle(normalized.title);
    setContent(normalized.content);
  }, []);

  const navigation = useChapterEditorNavigation({
    chapter,
    chapterIndex,
    wordCount,
    work,
    workId,
  });
  const {
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
    goToChapter: navigateToChapter,
    handleBatchAddChapters: batchAddChapters,
    maxChapterIndex,
    mergeChapterListItem,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
  } = navigation;

  const applySavedMetaFromChapter = useCallback((savedChapter: ChapterDetail) => {
    applyMetaFromChapterRef.current?.(savedChapter);
  }, []);

  const {
    dirty,
    draftSaving,
    draftUnsynced,
    saveNow,
    saving,
    setDirty,
    setDraftUnsynced,
    updateContent,
    updateTitle,
  } = useChapterEditorSave({
    applyBootstrap,
    applyMetaFromChapter: applySavedMetaFromChapter,
    chapterIndex,
    content,
    mergeChapterListItem,
    setContent,
    setError,
    setTitle,
    title,
    workId,
  });

  const statusText = saving
    ? "正式保存中..."
    : draftSaving
      ? "草稿保存中..."
      : dirty
        ? "草稿未保存"
        : chapter?.updatedAt
          ? `草稿已保存 · ${formatTime(chapter.updatedAt)}`
          : "草稿已保存";

  const meta = useChapterEditorMeta({
    applyBootstrap,
    chapterIndex,
    content,
    mergeChapterListItem,
    saving,
    setChapter,
    setError,
    work,
    workId,
  });
  const {
    applyMetaFromChapter,
    chapterDetails,
    chapterOutlineText,
    chapterSummary,
    detailsBusy,
    detailsActionError,
    detailsProgressPercent,
    detailsText,
    handleConfirmMetaGenerate,
    handleConfirmMetaEditor,
    handleExtractDetails,
    handleGenerateSummary,
    handleOutlineActionClick: requestOutlineAction,
    metaGenerateKind,
    metaGeneratePrompt,
    metaEditorKind,
    metaEditorValue,
    metaSaving,
    openMetaEditor,
    outlineActionLabel,
    outlineActionError,
    outlineBusy,
    outlineGridActionLabel,
    outlinePreviewLines,
    outlineProgressPercent,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setMetaEditorKind,
    setMetaEditorValue,
    summaryBusy,
    summaryActionError,
    summaryPreview,
    summaryProgressPercent,
    updateDetailsText,
    updateOutlineText,
    updateSummary,
    visibleDetails,
  } = meta;

  useEffect(() => {
    applyMetaFromChapterRef.current = applyMetaFromChapter;
  }, [applyMetaFromChapter]);

  const ai = useChapterEditorAi({
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
    work,
    workId,
  });
  const {
    aiButtonLabel,
    aiStageMessage,
    effectiveAiBusy,
    effectiveAiProgress,
    handleAiActionClick,
    handleConfirmRegenerate,
    regenerateOpen,
    regeneratePrompt,
    setRegenerateOpen,
    setRegeneratePrompt,
    sharedAiBusy,
  } = ai;
  const { copiedTarget, handleCopy } = useChapterEditorClipboard();

  useChapterEditorBootstrap({
    applyBootstrap,
    applyChapterOverview,
    applyMetaFromChapter,
    chapterIndex,
    setBootstrapLoading,
    setContent,
    setDirty,
    setDraftUnsynced,
    setError,
    setIsAdmin,
    setTitle,
    setUserDisplayName,
    setUserEmail,
    workId,
  });

  const handleRevisionRestored = useCallback(
    (restoredChapter: ChapterDetail) => {
      const normalized = normalizeChapterDraft(restoredChapter);
      setChapter(restoredChapter);
      setTitle(normalized.title);
      setContent(normalized.content);
      setDirty(false);
      setDraftUnsynced(false);
      applyMetaFromChapter(restoredChapter);
      mergeChapterListItem(restoredChapter);
      setError("");
    },
    [applyMetaFromChapter, mergeChapterListItem, setDirty, setDraftUnsynced],
  );

  const rewrite = useChapterEditorRewrite({
    chapterIndex,
    content,
    dirty,
    draftUnsynced,
    effectiveAiBusy,
    metaSaving,
    saving,
    saveNow,
    setError,
    workId,
  });
  const { closeRewriteDialog } = rewrite;

  const consistency = useChapterConsistency({
    chapterIndex,
    content,
    dirty,
    draftUnsynced,
    effectiveAiBusy,
    metaSaving,
    saving,
    setError,
    workId,
  });

  useChapterEditorShortcuts({
    closeRewriteDialog,
    dirty,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
    setMetaEditorKind,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setRegenerateOpen,
  });

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});
      if (response.success && response.data?.redirectTo) {
        window.location.href = response.data.redirectTo;
      }
    } finally {
      setLogoutBusy(false);
    }
  }

  const goToChapter = useCallback(
    async (targetIndex: number, options?: { autoAi?: boolean }) => {
      if (dirty || saving || effectiveAiBusy || metaSaving) {
        setError("请等待当前内容保存完成后再切换章节");
        setTimeout(() => setError(""), 3000);
        return;
      }
      await navigateToChapter(targetIndex, options);
    },
    [dirty, effectiveAiBusy, metaSaving, navigateToChapter, saving],
  );

  const handleBatchAddChapters = useCallback(async () => {
    if (dirty || saving || effectiveAiBusy || metaSaving) return;
    await batchAddChapters();
  }, [batchAddChapters, dirty, effectiveAiBusy, metaSaving, saving]);

  const handleOutlineActionClick = useCallback(() => {
    requestOutlineAction();
  }, [requestOutlineAction]);

  return {
    aiButtonLabel,
    aiStageMessage,
    bootstrapLoading,
    chapter,
    chapterDetails,
    chapterIndex,
    chapterLabel,
    chapterList,
    chapterMenuFocusNonce,
    chapterMenuChapters,
    chapterMenuOpen,
    chapterMenuVolumeLabel,
    chapterOutlineText,
    chapterSummary,
    commandChapters,
    commandOpen,
    commandQuery,
    content,
    copiedTarget,
    currentChapterEdited,
    ...consistency,
    detailsBusy,
    detailsActionError,
    detailsProgressPercent,
    detailsText,
    draftSaving,
    draftUnsynced,
    dirty,
    effectiveAiBusy,
    effectiveAiProgress,
    error,
    goToChapter,
    handleAiActionClick,
    handleBatchAddChapters,
    handleConfirmMetaGenerate,
    handleConfirmMetaEditor,
    handleConfirmRegenerate,
    handleCopy,
    handleExtractDetails,
    handleGenerateSummary,
    handleLogout,
    handleManualSave: saveNow,
    handleOutlineActionClick,
    isAdmin,
    logoutBusy,
    maxChapterIndex,
    metaGenerateKind,
    metaGeneratePrompt,
    metaEditorKind,
    metaEditorValue,
    metaSaving,
    openMetaEditor,
    outlineActionLabel,
    outlineActionError,
    outlineBusy,
    outlineGridActionLabel,
    outlinePreviewLines,
    outlineProgressPercent,
    regenerateOpen,
    regeneratePrompt,
    revisionDialogOpen,
    ...rewrite,
    saving,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setMetaEditorKind,
    setMetaEditorValue,
    setRegenerateOpen,
    setRegeneratePrompt,
    setRevisionDialogOpen,
    sharedAiBusy,
    statusText,
    summaryBusy,
    summaryActionError,
    summaryPreview,
    summaryProgressPercent,
    title,
    updateContent,
    updateDetailsText,
    updateOutlineText,
    updateSummary,
    updateTitle,
    userEmail,
    userDisplayName,
    visibleDetails,
    wordCount,
    work,
    workId,
    handleRevisionRestored,
  };
}

export type WorkChapterEditorController = ReturnType<typeof useWorkChapterEditor>;

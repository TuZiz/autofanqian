"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import {
  countWords,
  formatTime,
  normalizeChapterDraft,
} from "./chapter-editor-format";
import type {
  ChapterBootstrap,
  ChapterDetail,
  ChapterOverview,
  ChapterSessionUser,
  WorkLite,
} from "./chapter-editor-types";
import { useChapterEditorAi } from "./use-chapter-editor-ai";
import { useChapterEditorClipboard } from "./use-chapter-editor-clipboard";
import { useChapterEditorMeta } from "./use-chapter-editor-meta";
import { useChapterEditorNavigation } from "./use-chapter-editor-navigation";

function clearTimer(ref: MutableRefObject<number | null>) {
  if (!ref.current) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}

export function useWorkChapterEditor(params: {
  autoAi: boolean;
  chapterIndex: number;
  workId: string;
}) {
  const { autoAi, chapterIndex, workId } = params;

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [work, setWork] = useState<WorkLite | null>(null);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveTimerRef = useRef<number | null>(null);

  const wordCount = useMemo(() => countWords(content), [content]);
  const statusText = saving
    ? "保存中..."
    : dirty
      ? "未保存"
      : chapter?.updatedAt
        ? `已保存 · ${formatTime(chapter.updatedAt)}`
        : "已保存";

  const applyBootstrap = useCallback((payload: ChapterBootstrap) => {
    const normalized = normalizeChapterDraft(payload.chapter);
    setWork(payload.work);
    setChapter(payload.chapter);
    setTitle(normalized.title);
    setContent(normalized.content);
    setDirty(false);
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
    workId,
  });
  const {
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
  } = ai;
  const { copiedTarget, handleCopy } = useChapterEditorClipboard();

  useEffect(() => () => clearTimer(saveTimerRef), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) {
        setError("章节参数无效，请返回上一页重试。");
        setBootstrapLoading(false);
        return;
      }

      const [sessionRes, chapterRes, chaptersRes] = await Promise.all([
        apiRequest<{ user: ChapterSessionUser }>("/api/auth/session"),
        apiRequest<ChapterBootstrap>(
          `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}`,
          undefined,
          { method: "GET" },
        ),
        apiRequest<ChapterOverview>(`/api/works/${encodeURIComponent(workId)}/chapters`),
      ]);

      if (cancelled) return;
      if (!sessionRes.success || !sessionRes.data?.user?.email) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(sessionRes.data.user.email);
      setIsAdmin(Boolean(sessionRes.data.user.isAdmin));

      if (chapterRes.success && chapterRes.data?.work && chapterRes.data?.chapter) {
        applyBootstrap(chapterRes.data);
        applyMetaFromChapter(chapterRes.data.chapter);
        setError("");
      } else {
        setError(chapterRes.message || "加载章节失败");
      }

      if (chaptersRes.success && chaptersRes.data?.chapters) {
        applyChapterOverview(chaptersRes.data);
      }

      setBootstrapLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyBootstrap, applyChapterOverview, applyMetaFromChapter, chapterIndex, workId]);

  const saveNow = useCallback(
    async (next?: { title?: string; content?: string }) => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0 || saving) return;

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
    },
    [
      applyBootstrap,
      applyMetaFromChapter,
      chapterIndex,
      content,
      mergeChapterListItem,
      saving,
      title,
      workId,
    ],
  );

  const scheduleSave = useCallback(
    (next?: { title?: string; content?: string }) => {
      clearTimer(saveTimerRef);
      setDirty(true);
      saveTimerRef.current = window.setTimeout(() => void saveNow(next), 650);
    },
    [saveNow],
  );

  const updateTitle = useCallback(
    (value: string) => {
      const next = value.slice(0, 120);
      setTitle(next);
      scheduleSave({ title: next });
    },
    [scheduleSave],
  );

  const updateContent = useCallback(
    (value: string) => {
      const next = value.slice(0, 200_000);
      setContent(next);
      scheduleSave({ content: next });
    },
    [scheduleSave],
  );

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});
    if (response.success && response.data?.redirectTo) {
      window.location.href = response.data.redirectTo;
      return;
    }
    setLogoutBusy(false);
  }

  const goToChapter = useCallback(
    async (targetIndex: number, options?: { autoAi?: boolean }) => {
      if (dirty || saving || effectiveAiBusy || metaSaving) return;
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandQuery("");
        requestChapterMenuSearchFocus();
        setChapterMenuOpen(true);
      }
      if (event.key === "Escape") {
        setChapterMenuOpen(false);
        setCommandOpen(false);
        setCommandQuery("");
        setRegenerateOpen(false);
        setMetaGenerateKind(null);
        setMetaGeneratePrompt("");
        setMetaEditorKind(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setMetaEditorKind,
    setRegenerateOpen,
  ]);

  return {
    aiButtonLabel,
    aiThinking,
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
    detailsBusy,
    detailsActionError,
    detailsProgressPercent,
    detailsText,
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
    visibleDetails,
    wordCount,
    work,
    workId,
  };
}

export type WorkChapterEditorController = ReturnType<typeof useWorkChapterEditor>;

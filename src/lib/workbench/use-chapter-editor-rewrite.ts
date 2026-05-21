"use client";

import { useCallback, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

import type { ChapterDetail } from "./chapter-editor-types";

export type ChapterRewriteAction =
  | "polish"
  | "expand"
  | "compress"
  | "add_conflict"
  | "add_emotion"
  | "short_drama"
  | "fanqie_style"
  | "logic_check";

type RewritePreviewResponse = {
  action: ChapterRewriteAction;
  preview?: string;
  report?: string;
  rewrittenText?: string;
  originalWordCount?: number;
  previewWordCount?: number;
};

type RewriteApplyResponse = {
  chapter: ChapterDetail;
};

export const rewriteActionLabels: Record<ChapterRewriteAction, string> = {
  polish: aiZhCN.chapterRewrite.actions.polish.label,
  expand: aiZhCN.chapterRewrite.actions.expand.label,
  compress: aiZhCN.chapterRewrite.actions.compress.label,
  add_conflict: aiZhCN.chapterRewrite.actions.add_conflict.label,
  add_emotion: aiZhCN.chapterRewrite.actions.add_emotion.label,
  short_drama: aiZhCN.chapterRewrite.actions.short_drama.label,
  fanqie_style: aiZhCN.chapterRewrite.actions.fanqie_style.label,
  logic_check: aiZhCN.chapterRewrite.actions.logic_check.label,
};

export const rewriteActionDescriptions: Record<ChapterRewriteAction, string> = {
  polish: aiZhCN.chapterRewrite.actions.polish.description,
  expand: aiZhCN.chapterRewrite.actions.expand.description,
  compress: aiZhCN.chapterRewrite.actions.compress.description,
  add_conflict: aiZhCN.chapterRewrite.actions.add_conflict.description,
  add_emotion: aiZhCN.chapterRewrite.actions.add_emotion.description,
  short_drama: aiZhCN.chapterRewrite.actions.short_drama.description,
  fanqie_style: aiZhCN.chapterRewrite.actions.fanqie_style.description,
  logic_check: aiZhCN.chapterRewrite.actions.logic_check.description,
};

export function useChapterEditorRewrite(params: {
  chapterIndex: number;
  content: string;
  dirty: boolean;
  draftUnsynced: boolean;
  effectiveAiBusy: boolean;
  handleRevisionRestored: (chapter: ChapterDetail) => void;
  metaSaving: boolean;
  saving: boolean;
  setError: (message: string) => void;
  workId: string;
}) {
  const {
    chapterIndex,
    content,
    dirty,
    draftUnsynced,
    effectiveAiBusy,
    handleRevisionRestored,
    metaSaving,
    saving,
    setError,
    workId,
  } = params;

  const [rewriteDialogOpen, setRewriteDialogOpen] = useState(false);
  const [rewriteAction, setRewriteAction] = useState<ChapterRewriteAction>("polish");
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [rewritePreview, setRewritePreview] = useState("");
  const [rewriteReport, setRewriteReport] = useState("");
  const [rewriteSelection, setRewriteSelection] = useState({ start: 0, end: 0, text: "" });
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteApplying, setRewriteApplying] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  const rewriteBlockedReason = useMemo(() => {
    if (!content.trim()) return aiZhCN.chapterRewrite.blockedEmpty;
    if (dirty || draftUnsynced) return aiZhCN.chapterRewrite.blockedDraft;
    if (saving || metaSaving) return aiZhCN.chapterRewrite.blockedSaving;
    if (effectiveAiBusy) return aiZhCN.chapterRewrite.blockedBusy;
    return "";
  }, [content, dirty, draftUnsynced, effectiveAiBusy, metaSaving, saving]);

  const resetRewriteResult = useCallback(() => {
    setRewritePreview("");
    setRewriteReport("");
    setRewriteError("");
  }, []);

  const openRewriteDialog = useCallback(
    (action: ChapterRewriteAction) => {
      setRewriteAction(action);
      setRewriteDialogOpen(true);
      resetRewriteResult();
      if (rewriteBlockedReason) {
        setRewriteError(rewriteBlockedReason);
      }
    },
    [resetRewriteResult, rewriteBlockedReason],
  );

  const handleConfirmRewrite = useCallback(async () => {
    if (rewriteBusy || rewriteApplying) return;
    if (rewriteBlockedReason) {
      setRewriteError(rewriteBlockedReason);
      return;
    }

    setRewriteBusy(true);
    setRewriteError("");
    setRewritePreview("");
    setRewriteReport("");

    const res = await apiRequest<RewritePreviewResponse>(
      "/api/ai/chapter/rewrite",
      {
        workId,
        index: chapterIndex,
        rewriteMode: rewriteAction,
        selectedText: rewriteSelection.text || undefined,
        extraPrompt: rewritePrompt,
      },
      { method: "POST" },
    );

    setRewriteBusy(false);

    if (!res.success || !res.data) {
      const message = res.message || aiZhCN.chapterRewrite.failed;
      setRewriteError(message);
      setError(message);
      return;
    }

    if (res.data.report) {
      setRewriteReport(res.data.report);
      return;
    }

    setRewritePreview(res.data.rewrittenText ?? res.data.preview ?? "");
  }, [
    chapterIndex,
    rewriteAction,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    rewritePrompt,
    rewriteSelection.text,
    setError,
    workId,
  ]);

  const handleApplyRewrite = useCallback(async () => {
    if (rewriteApplying || rewriteBusy) return;
    if (rewriteAction === "logic_check") return;
    if (!rewritePreview.trim()) {
      setRewriteError(aiZhCN.chapterRewrite.previewMissing);
      return;
    }

    setRewriteApplying(true);
    setRewriteError("");

    const draftContent =
      rewriteSelection.text && rewriteSelection.end > rewriteSelection.start
        ? `${content.slice(0, rewriteSelection.start)}${rewritePreview}${content.slice(rewriteSelection.end)}`
        : rewritePreview;

    const res = await apiRequest<RewriteApplyResponse>(
      "/api/ai/chapter/rewrite",
      {
        workId,
        index: chapterIndex,
        rewriteMode: rewriteAction,
        apply: true,
        draftContent,
      },
      { method: "POST" },
    );

    setRewriteApplying(false);

    if (!res.success || !res.data?.chapter) {
      const message = res.message || aiZhCN.chapterRewrite.applyFailed;
      setRewriteError(message);
      setError(message);
      return;
    }

    handleRevisionRestored(res.data.chapter);
    setRewriteDialogOpen(false);
    resetRewriteResult();
    setRewritePrompt("");
  }, [
    chapterIndex,
    content,
    handleRevisionRestored,
    resetRewriteResult,
    rewriteAction,
    rewriteApplying,
    rewriteBusy,
    rewritePreview,
    rewriteSelection,
    setError,
    workId,
  ]);

  const closeRewriteDialog = useCallback(() => {
    if (rewriteBusy || rewriteApplying) return;
    setRewriteDialogOpen(false);
    setRewritePreview("");
    setRewriteReport("");
    setRewriteError("");
  }, [rewriteApplying, rewriteBusy]);

  return {
    closeRewriteDialog,
    handleApplyRewrite,
    handleConfirmRewrite,
    openRewriteDialog,
    resetRewriteResult,
    rewriteAction,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    rewriteDialogOpen,
    rewriteError,
    rewritePreview,
    rewritePrompt,
    rewriteReport,
    rewriteSelection,
    setRewriteSelection,
    setRewriteAction,
    setRewriteDialogOpen,
    setRewritePreview,
    setRewritePrompt,
  };
}

"use client";

import { useCallback, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

import type { ChapterDetail } from "./chapter-editor-types";

export type ChapterRewriteAction = "polish" | "expand" | "compress" | "conflict" | "logic_check";

type RewritePreviewResponse = {
  action: ChapterRewriteAction;
  preview?: string;
  report?: string;
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
  conflict: aiZhCN.chapterRewrite.actions.conflict.label,
  logic_check: aiZhCN.chapterRewrite.actions.logic_check.label,
};

export const rewriteActionDescriptions: Record<ChapterRewriteAction, string> = {
  polish: aiZhCN.chapterRewrite.actions.polish.description,
  expand: aiZhCN.chapterRewrite.actions.expand.description,
  compress: aiZhCN.chapterRewrite.actions.compress.description,
  conflict: aiZhCN.chapterRewrite.actions.conflict.description,
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
        action: rewriteAction,
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

    setRewritePreview(res.data.preview ?? "");
  }, [
    chapterIndex,
    rewriteAction,
    rewriteApplying,
    rewriteBlockedReason,
    rewriteBusy,
    rewritePrompt,
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

    const res = await apiRequest<RewriteApplyResponse>(
      "/api/ai/chapter/rewrite",
      {
        workId,
        index: chapterIndex,
        action: rewriteAction,
        apply: true,
        draftContent: rewritePreview,
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
    handleRevisionRestored,
    resetRewriteResult,
    rewriteAction,
    rewriteApplying,
    rewriteBusy,
    rewritePreview,
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
    setRewriteAction,
    setRewriteDialogOpen,
    setRewritePreview,
    setRewritePrompt,
  };
}

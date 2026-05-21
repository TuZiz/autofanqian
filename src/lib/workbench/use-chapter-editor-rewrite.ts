"use client";

import { useCallback, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

export type ChapterRewriteAction =
  | "polish"
  | "expand"
  | "compress"
  | "add_conflict"
  | "add_emotion"
  | "short_drama"
  | "fanqie_style"
  | "xiaohongshu_style"
  | "logic_check";

type RewritePreviewResponse = {
  action: ChapterRewriteAction;
  preview?: string;
  report?: string;
  rewrittenText?: string;
  originalWordCount?: number;
  previewWordCount?: number;
};

export const rewriteActionLabels: Record<ChapterRewriteAction, string> = {
  polish: aiZhCN.chapterRewrite.actions.polish.label,
  expand: aiZhCN.chapterRewrite.actions.expand.label,
  compress: aiZhCN.chapterRewrite.actions.compress.label,
  add_conflict: aiZhCN.chapterRewrite.actions.add_conflict.label,
  add_emotion: aiZhCN.chapterRewrite.actions.add_emotion.label,
  short_drama: aiZhCN.chapterRewrite.actions.short_drama.label,
  fanqie_style: aiZhCN.chapterRewrite.actions.fanqie_style.label,
  xiaohongshu_style: aiZhCN.chapterRewrite.actions.xiaohongshu_style.label,
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
  xiaohongshu_style: aiZhCN.chapterRewrite.actions.xiaohongshu_style.description,
  logic_check: aiZhCN.chapterRewrite.actions.logic_check.description,
};

export function useChapterEditorRewrite(params: {
  chapterIndex: number;
  content: string;
  dirty: boolean;
  draftUnsynced: boolean;
  effectiveAiBusy: boolean;
  metaSaving: boolean;
  saveNow: (next?: {
    title?: string;
    content?: string;
    revisionSource?: "ai_rewrite";
    revisionReason?: string;
  }) => Promise<boolean>;
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
    metaSaving,
    saveNow,
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

  const openFullChapterRewriteDialog = useCallback(
    (action: ChapterRewriteAction) => {
      setRewriteSelection({ start: 0, end: 0, text: "" });
      openRewriteDialog(action);
    },
    [openRewriteDialog],
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
        chapterIndex,
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

    setRewriteError("");

    const nextContent =
      rewriteSelection.text && rewriteSelection.end > rewriteSelection.start
        ? `${content.slice(0, rewriteSelection.start)}${rewritePreview}${content.slice(rewriteSelection.end)}`
        : rewritePreview;

    setRewriteApplying(true);
    const saved = await saveNow({
      content: nextContent,
      revisionSource: "ai_rewrite",
      revisionReason: `AI 改写应用前快照：${rewriteActionLabels[rewriteAction]}`,
    });
    setRewriteApplying(false);

    if (!saved) {
      const message = aiZhCN.chapterRewrite.applyFailed;
      setRewriteError(message);
      setError(message);
      return;
    }

    setRewriteDialogOpen(false);
    resetRewriteResult();
    setRewritePrompt("");
  }, [
    content,
    resetRewriteResult,
    rewriteAction,
    rewriteApplying,
    rewriteBusy,
    rewritePreview,
    rewriteSelection,
    saveNow,
    setError,
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
    openFullChapterRewriteDialog,
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

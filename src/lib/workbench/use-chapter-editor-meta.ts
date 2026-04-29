"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import {
  clampProgress,
  normalizeDetailLines,
  splitPreviewLines,
} from "./chapter-editor-format";
import type {
  ChapterBootstrap,
  ChapterDetail,
  MetaEditorKind,
  MetaPatch,
  WorkLite,
} from "./chapter-editor-types";

type UseChapterEditorMetaParams = {
  applyBootstrap: (payload: ChapterBootstrap) => void;
  chapterIndex: number;
  content: string;
  mergeChapterListItem: (chapter: ChapterDetail) => void;
  saving: boolean;
  setChapter: Dispatch<SetStateAction<ChapterDetail | null>>;
  setError: (message: string) => void;
  work: WorkLite | null;
  workId: string;
};

type MetaGenerateKind = "summary" | "outline";
type MetaActionKind = MetaGenerateKind | "details";

function clearTimer(ref: MutableRefObject<number | null>) {
  if (!ref.current) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}

export function useChapterEditorMeta({
  applyBootstrap,
  chapterIndex,
  content,
  mergeChapterListItem,
  saving,
  setChapter,
  setError,
  work,
  workId,
}: UseChapterEditorMetaParams) {
  const [metaGenerateKind, setMetaGenerateKind] =
    useState<MetaGenerateKind | null>(null);
  const [metaGeneratePrompt, setMetaGeneratePrompt] = useState("");
  const [metaEditorKind, setMetaEditorKind] = useState<MetaEditorKind | null>(null);
  const [metaEditorValue, setMetaEditorValue] = useState("");
  const [metaActionError, setMetaActionError] =
    useState<{ kind: MetaActionKind; message: string } | null>(null);
  const [chapterSummary, setChapterSummary] = useState("");
  const [chapterOutlineText, setChapterOutlineText] = useState("");
  const [chapterDetails, setChapterDetails] = useState<string[]>([]);
  const [detailsText, setDetailsText] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [outlineProgress, setOutlineProgress] = useState(0);
  const [detailsProgress, setDetailsProgress] = useState(0);

  const summarySaveTimerRef = useRef<number | null>(null);
  const outlineSaveTimerRef = useRef<number | null>(null);
  const detailsSaveTimerRef = useRef<number | null>(null);
  const metaActionErrorTimerRef = useRef<number | null>(null);
  const progressTimersRef = useRef<number[]>([]);
  const pendingMetaPatchRef = useRef<MetaPatch | null>(null);
  const hasChapterContent = Boolean(content.trim());

  useEffect(() => {
    return () => {
      [
        summarySaveTimerRef,
        outlineSaveTimerRef,
        detailsSaveTimerRef,
        metaActionErrorTimerRef,
      ].forEach(clearTimer);
      progressTimersRef.current.forEach((timer) => window.clearInterval(timer));
      progressTimersRef.current = [];
    };
  }, []);

  const showMetaActionError = useCallback((kind: MetaActionKind, message = "先写正文") => {
    clearTimer(metaActionErrorTimerRef);
    setMetaActionError({ kind, message });
    metaActionErrorTimerRef.current = window.setTimeout(() => {
      setMetaActionError((current) => (current?.kind === kind ? null : current));
      metaActionErrorTimerRef.current = null;
    }, 2400);
  }, []);

  const applyMetaFromChapter = useCallback((chapter: ChapterDetail) => {
    const details = Array.isArray(chapter.details) ? chapter.details : [];
    setChapterSummary(chapter.summary ?? "");
    setChapterOutlineText(chapter.chapterOutline ?? "");
    setChapterDetails(details);
    setDetailsText(details.join("\n"));
  }, []);

  const startProgress = useCallback((setter: (value: number) => void, step = 180) => {
    setter(8);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setter(Math.min(92, 8 + Math.floor((Date.now() - startedAt) / step)));
    }, 260);
    progressTimersRef.current.push(timer);
    return () => {
      window.clearInterval(timer);
      progressTimersRef.current = progressTimersRef.current.filter((item) => item !== timer);
    };
  }, []);

  const saveChapterMeta = useCallback(
    async (patch: MetaPatch) => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) return;
      if (metaSaving) {
        pendingMetaPatchRef.current = { ...(pendingMetaPatchRef.current ?? {}), ...patch };
        return;
      }

      setMetaSaving(true);
      const res = await apiRequest<ChapterBootstrap>(
        `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}`,
        patch,
        { method: "PUT" },
      );
      setMetaSaving(false);

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
      mergeChapterListItem,
      metaSaving,
      setError,
      workId,
    ],
  );

  useEffect(() => {
    if (metaSaving || !pendingMetaPatchRef.current) return;
    const pending = pendingMetaPatchRef.current;
    pendingMetaPatchRef.current = null;
    const timer = window.setTimeout(() => void saveChapterMeta(pending), 80);
    return () => window.clearTimeout(timer);
  }, [metaSaving, saveChapterMeta]);

  const openMetaEditor = useCallback(
    (kind: MetaEditorKind) => {
      setMetaEditorKind(kind);
      setMetaEditorValue(
        kind === "summary"
          ? chapterSummary
          : kind === "outline"
            ? chapterOutlineText
            : detailsText,
      );
    },
    [chapterOutlineText, chapterSummary, detailsText],
  );

  const handleConfirmMetaEditor = useCallback(async () => {
    if (!metaEditorKind) return;
    const value = metaEditorValue.trim();
    if (metaEditorKind === "summary") {
      setChapterSummary(value);
      setMetaEditorKind(null);
      await saveChapterMeta({ summary: value || null });
      return;
    }
    if (metaEditorKind === "outline") {
      setChapterOutlineText(value);
      setMetaEditorKind(null);
      await saveChapterMeta({ chapterOutline: value || null });
      return;
    }
    const normalized = normalizeDetailLines(value);
    setDetailsText(value);
    setChapterDetails(normalized);
    setMetaEditorKind(null);
    await saveChapterMeta({ details: normalized });
  }, [metaEditorKind, metaEditorValue, saveChapterMeta]);

  const generateMeta = useCallback(
    async (kind: "summary" | "outline" | "details", extraPrompt = "") => {
      if (!workId || !Number.isFinite(chapterIndex) || chapterIndex <= 0) return;
      if (!hasChapterContent) {
        showMetaActionError(kind);
        return;
      }
      const busySetter =
        kind === "summary" ? setSummaryBusy : kind === "outline" ? setOutlineBusy : setDetailsBusy;
      const progressSetter =
        kind === "summary"
          ? setSummaryProgress
          : kind === "outline"
            ? setOutlineProgress
            : setDetailsProgress;
      busySetter(true);
      const stop = startProgress(progressSetter, kind === "details" ? 160 : kind === "outline" ? 200 : 180);
      const endpoint = kind === "summary" ? "summary" : kind === "outline" ? "outline" : "details";
      const trimmedPrompt = extraPrompt.trim();
      setMetaActionError((current) => (current?.kind === kind ? null : current));
      const res = await apiRequest<{ chapter: ChapterDetail }>(`/api/ai/chapter/${endpoint}`, {
        workId,
        index: chapterIndex,
        ...(trimmedPrompt ? { extraPrompt: trimmedPrompt } : {}),
      });
      stop();
      busySetter(false);
      progressSetter(res.success ? 100 : 0);
      window.setTimeout(() => progressSetter(0), 900);

      if (!res.success || !res.data?.chapter) {
        if (res.status === 400 && res.message.includes("正文为空")) {
          showMetaActionError(kind);
          return;
        }
        setError(res.message || "AI 生成失败，请稍后重试。");
        return;
      }

      const nextChapter = res.data.chapter;
      if (kind === "summary") {
        const summary = nextChapter.summary ?? "";
        setChapterSummary(summary);
        setChapter((current) =>
          current
            ? { ...current, summary, updatedAt: nextChapter.updatedAt }
            : nextChapter,
        );
      } else if (kind === "outline") {
        const chapterOutline = nextChapter.chapterOutline ?? "";
        setChapterOutlineText(chapterOutline);
        setChapter((current) =>
          current
            ? { ...current, chapterOutline, updatedAt: nextChapter.updatedAt }
            : nextChapter,
        );
      } else {
        const details = Array.isArray(nextChapter.details) ? nextChapter.details : [];
        setChapterDetails(details);
        setDetailsText(details.join("\n"));
        setChapter((current) =>
          current
            ? { ...current, details, updatedAt: nextChapter.updatedAt }
            : nextChapter,
        );
      }
      mergeChapterListItem(nextChapter);
      setError("");
    },
    [
      chapterIndex,
      hasChapterContent,
      mergeChapterListItem,
      setChapter,
      setError,
      showMetaActionError,
      startProgress,
      workId,
    ],
  );

  const openMetaGenerateDialog = useCallback(
    (kind: MetaGenerateKind) => {
      if (!work || saving) return;
      if (kind === "summary" && summaryBusy) return;
      if (kind === "outline" && outlineBusy) return;
      if (!hasChapterContent) {
        showMetaActionError(kind);
        return;
      }
      const existingText =
        kind === "summary" ? chapterSummary.trim() : chapterOutlineText.trim();
      if (!existingText) {
        void generateMeta(kind);
        return;
      }
      setMetaGenerateKind(kind);
      setMetaGeneratePrompt("");
    },
    [
      chapterOutlineText,
      chapterSummary,
      generateMeta,
      hasChapterContent,
      outlineBusy,
      saving,
      showMetaActionError,
      summaryBusy,
      work,
    ],
  );

  const handleGenerateSummary = useCallback(
    () => openMetaGenerateDialog("summary"),
    [openMetaGenerateDialog],
  );
  const handleGenerateOutline = useCallback(
    () => openMetaGenerateDialog("outline"),
    [openMetaGenerateDialog],
  );
  const handleExtractDetails = useCallback(() => generateMeta("details"), [generateMeta]);

  const requestOutlineAction = useCallback(() => {
    if (!work || outlineBusy || saving) return;
    handleGenerateOutline();
  }, [handleGenerateOutline, outlineBusy, saving, work]);

  const handleConfirmMetaGenerate = useCallback(() => {
    if (!metaGenerateKind) return;
    const kind = metaGenerateKind;
    const prompt = metaGeneratePrompt;
    setMetaGenerateKind(null);
    setMetaGeneratePrompt("");
    void generateMeta(kind, prompt);
  }, [generateMeta, metaGenerateKind, metaGeneratePrompt]);

  const updateSummary = useCallback(
    (value: string) => {
      const next = value.slice(0, 12_000);
      setChapterSummary(next);
      clearTimer(summarySaveTimerRef);
      summarySaveTimerRef.current = window.setTimeout(
        () => void saveChapterMeta({ summary: next.trim() || null }),
        700,
      );
    },
    [saveChapterMeta],
  );

  const updateOutlineText = useCallback(
    (value: string) => {
      const next = value.slice(0, 24_000);
      setChapterOutlineText(next);
      clearTimer(outlineSaveTimerRef);
      outlineSaveTimerRef.current = window.setTimeout(
        () => void saveChapterMeta({ chapterOutline: next.trim() || null }),
        700,
      );
    },
    [saveChapterMeta],
  );

  const updateDetailsText = useCallback(
    (value: string) => {
      const next = value.slice(0, 80_000);
      const normalized = normalizeDetailLines(next);
      setDetailsText(next);
      setChapterDetails(normalized);
      clearTimer(detailsSaveTimerRef);
      detailsSaveTimerRef.current = window.setTimeout(
        () => void saveChapterMeta({ details: normalized }),
        700,
      );
    },
    [saveChapterMeta],
  );

  return {
    applyMetaFromChapter,
    chapterDetails,
    chapterOutlineText,
    chapterSummary,
    detailsBusy,
    detailsActionError:
      metaActionError?.kind === "details" ? metaActionError.message : "",
    detailsProgressPercent: Math.round(clampProgress(detailsProgress)),
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
    outlineActionLabel: outlineBusy
      ? `生成中 ${Math.round(clampProgress(outlineProgress))}%`
      : chapterOutlineText.trim()
        ? "重新生成"
        : "AI 生成",
    outlineActionError:
      metaActionError?.kind === "outline" ? metaActionError.message : "",
    outlineBusy,
    outlineGridActionLabel: outlineBusy
      ? `大纲生成中 ${Math.round(clampProgress(outlineProgress))}%`
      : "生成大纲",
    outlinePreviewLines: splitPreviewLines(chapterOutlineText, 4),
    outlineProgressPercent: Math.round(clampProgress(outlineProgress)),
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setMetaEditorKind,
    setMetaEditorValue,
    summaryBusy,
    summaryActionError:
      metaActionError?.kind === "summary" ? metaActionError.message : "",
    summaryPreview: chapterSummary.trim(),
    summaryProgressPercent: Math.round(clampProgress(summaryProgress)),
    updateDetailsText,
    updateOutlineText,
    updateSummary,
    visibleDetails: chapterDetails.slice(0, 5),
  };
}

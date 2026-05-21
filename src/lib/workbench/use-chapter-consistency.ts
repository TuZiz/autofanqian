"use client";

import { useCallback, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { ChapterConsistencyResult } from "@/shared/schemas/chapter-consistency";

export type ChapterConsistencyScope = "current" | "recent5";

export function useChapterConsistency(params: {
  chapterIndex: number;
  content: string;
  dirty: boolean;
  draftUnsynced: boolean;
  effectiveAiBusy: boolean;
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
    metaSaving,
    saving,
    setError,
    workId,
  } = params;

  const [consistencyBusy, setConsistencyBusy] = useState(false);
  const [consistencyError, setConsistencyError] = useState("");
  const [consistencyResult, setConsistencyResult] =
    useState<ChapterConsistencyResult | null>(null);
  const [consistencyScope, setConsistencyScope] =
    useState<ChapterConsistencyScope>("current");

  const consistencyBlockedReason = useMemo(() => {
    if (!content.trim()) return "当前章节正文为空，无法进行一致性检查。";
    if (dirty || draftUnsynced) return "请先保存当前草稿，再进行一致性检查。";
    if (saving || metaSaving) return "正在保存章节信息，请稍后再检查。";
    if (effectiveAiBusy) return "AI 正在处理其他任务，请稍后再检查。";
    return "";
  }, [content, dirty, draftUnsynced, effectiveAiBusy, metaSaving, saving]);

  const handleRunConsistencyCheck = useCallback(async () => {
    if (consistencyBusy) return;
    if (consistencyBlockedReason) {
      setConsistencyError(consistencyBlockedReason);
      return;
    }

    setConsistencyBusy(true);
    setConsistencyError("");

    const response = await apiRequest<ChapterConsistencyResult>(
      "/api/ai/chapter/consistency",
      { workId, chapterIndex, scope: consistencyScope },
      { method: "POST" },
    );

    setConsistencyBusy(false);

    if (!response.success || !response.data) {
      const message = response.message || "一致性检查失败，请稍后重试。";
      setConsistencyError(message);
      setError(message);
      return;
    }

    setConsistencyResult(response.data);
  }, [
    chapterIndex,
    consistencyBlockedReason,
    consistencyBusy,
    consistencyScope,
    setError,
    workId,
  ]);

  const clearConsistencyResult = useCallback(() => {
    setConsistencyError("");
    setConsistencyResult(null);
  }, []);

  return {
    clearConsistencyResult,
    consistencyBlockedReason,
    consistencyBusy,
    consistencyError,
    consistencyResult,
    consistencyScope,
    handleRunConsistencyCheck,
    setConsistencyScope,
  };
}

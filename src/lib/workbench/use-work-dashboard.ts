"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  useActiveChapterGeneration,
} from "@/lib/client/chapter-generation";
import { apiRequest } from "@/lib/client/auth-api";
import type { StoryOutline } from "@/lib/create/outline-draft";
import {
  canExtendPlanningWindow,
  DEFAULT_PLANNING_CONFIG,
  type PlanningPreset,
} from "@/lib/create/progressive-planning";

import type {
  ChapterListItem,
  HeaderChip,
  WorkDetail,
} from "./work-dashboard-types";
import { useWorkDashboardBootstrap } from "./use-work-dashboard-bootstrap";
import { isShortStoryWork } from "@/shared/work-type";

function hasOutlineField<K extends string>(
  outline: unknown,
  key: K,
): outline is Record<K, unknown> {
  return Boolean(outline && typeof outline === "object" && key in outline);
}

export function useWorkDashboard(workId: string) {
  const router = useRouter();

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [nextChapterIndex, setNextChapterIndex] = useState(1);
  const [maxChapterIndex, setMaxChapterIndex] = useState(0);
  const [addChapterBusy, setAddChapterBusy] = useState(false);
  const [addChapterError, setAddChapterError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workTitleSaving, setWorkTitleSaving] = useState(false);
  const [workTitleError, setWorkTitleError] = useState("");
  const [openVolumeIndex, setOpenVolumeIndex] = useState<number | null>(0);
  const [outlineRefineBusy, setOutlineRefineBusy] = useState(false);
  const [outlineRefineError, setOutlineRefineError] = useState("");
  const [outlineRefineConfirmOpen, setOutlineRefineConfirmOpen] = useState(false);
  const [outlineRefineSupplement, setOutlineRefineSupplement] = useState("");
  const [outlineExtensionSize, setOutlineExtensionSize] = useState<PlanningPreset>("smart");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [consistencyBusy, setConsistencyBusy] = useState(false);
  const [consistencyError, setConsistencyError] = useState("");
  const [consistencyNotice, setConsistencyNotice] = useState("");

  const outline = work?.outline;
  const isShortStory = isShortStoryWork(work?.workType);
  const activeGeneration = useActiveChapterGeneration(workId);
  const hasActiveGeneration = activeGeneration?.status === "running";
  const orderedNextChapterIndex =
    hasActiveGeneration && activeGeneration ? activeGeneration.index : nextChapterIndex;
  const generatingNextChapter =
    hasActiveGeneration && activeGeneration.index === orderedNextChapterIndex;

  useWorkDashboardBootstrap({
    hasActiveGeneration,
    setBootstrapLoading,
    setChapters,
    setError,
    setIsAdmin,
    setLoading,
    setMaxChapterIndex,
    setNextChapterIndex,
    setUserDisplayName,
    setUserEmail,
    setWork,
    workId,
  });

  function goToChapter(index: number, options?: { autoAi?: boolean }) {
    if (!workId) return;
    const base = `/dashboard/novel/${workId}/chapter/${index}`;
    const href = options?.autoAi ? `${base}?ai=1` : base;
    router.push(href);

    window.setTimeout(() => {
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== href) window.location.assign(href);
    }, 250);
  }

  async function handleAddChapter() {
    if (!workId || !work || addChapterBusy) return;

    const createIndex = Math.max(1, maxChapterIndex + 1);
    const plannedLimit = Math.max(
      work.plannedUntilChapter || 0,
      work.outline && "plannedUntilChapter" in work.outline
        ? work.outline.plannedUntilChapter || 0
        : 0,
      maxChapterIndex,
      chapters.length,
    );

    if (plannedLimit && createIndex > plannedLimit) {
      setAddChapterError(isShortStory ? "短篇场景已全部拆分。" : "请先规划下一段后再新增章节。");
      return;
    }

    setAddChapterBusy(true);
    setAddChapterError("");

    const result = await apiRequest<{
      work?: Pick<WorkDetail, "plannedUntilChapter" | "targetChapters">;
      chapter?: ChapterListItem;
    }>(`/api/works/${encodeURIComponent(workId)}/chapters/${createIndex}`);

    setAddChapterBusy(false);

    if (result.status === 401) {
      window.location.href = "/login";
      return;
    }

    const nextChapter = result.data?.chapter;
    if (!result.success || !nextChapter) {
      setAddChapterError(result.message || (isShortStory ? "新增场景失败，请稍后重试。" : "新增章节失败，请稍后重试。"));
      return;
    }

    setChapters((current) =>
      [...current.filter((chapter) => chapter.index !== nextChapter.index), nextChapter].sort(
        (left, right) => left.index - right.index,
      ),
    );
    setMaxChapterIndex((current) => Math.max(current, nextChapter.index));
    setWork((current) =>
      current
        ? {
            ...current,
            plannedUntilChapter: result.data?.work?.plannedUntilChapter ?? current.plannedUntilChapter,
            targetChapters: result.data?.work?.targetChapters ?? current.targetChapters,
          }
        : current,
    );
  }

  function openOutlineRefineConfirm() {
    if (!work || outlineRefineBusy) return;
    setOutlineRefineError("");
    setOutlineRefineConfirmOpen(true);
  }

  async function handleRefineOutline(supplement = "") {
    if (!workId || !work || outlineRefineBusy) return;

    setOutlineRefineBusy(true);
    setOutlineRefineError("");

    const presetLabel = DEFAULT_PLANNING_CONFIG.presets[outlineExtensionSize].label;
    const extensionInstruction = `本次只规划下一段：${presetLabel}。只追加未来窗口，不要重写已写章节，也不要一次性展开长期目标的全部章节。`;
    const finalSupplement = [extensionInstruction, supplement.trim()]
      .filter(Boolean)
      .join("\n");

    const result = await apiRequest<{
      outline: StoryOutline;
      targetChapters?: number;
      plannedUntilChapter?: number;
    }>("/api/ai/outline/refine", {
      workId,
      preset: outlineExtensionSize,
      supplement: finalSupplement,
    });

    if (result.status === 401) {
      window.location.href = "/login";
      return;
    }

    const nextOutline = result.data?.outline;

    if (!result.success || !nextOutline) {
      setOutlineRefineError(result.message || "规划下一段失败，请稍后重试。");
      setOutlineRefineBusy(false);
      return;
    }

    setWork((current) =>
      current
        ? {
            ...current,
            outline: nextOutline,
            targetChapters: result.data?.targetChapters ?? current.targetChapters,
            plannedUntilChapter:
              result.data?.plannedUntilChapter ??
              nextOutline.plannedUntilChapter ??
              current.plannedUntilChapter,
          }
        : current,
    );
    setOutlineRefineConfirmOpen(false);
    setOutlineRefineSupplement("");
    setOutlineRefineBusy(false);
  }

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

  async function saveWorkTitle(nextTitle: string) {
    const title = nextTitle.trim();
    if (!workId || !work || workTitleSaving) return false;

    if (!title) {
      setWorkTitleError("书名不能为空。");
      return false;
    }

    if (title === work.title) {
      setWorkTitleError("");
      return true;
    }

    setWorkTitleSaving(true);
    setWorkTitleError("");

    const result = await apiRequest<{ work: WorkDetail }>(
      `/api/works/${encodeURIComponent(workId)}`,
      { title },
      { method: "PATCH" },
    );

    setWorkTitleSaving(false);

    if (result.status === 401) {
      window.location.href = "/login";
      return false;
    }

    if (!result.success || !result.data?.work) {
      setWorkTitleError(result.message || "书名保存失败，请稍后重试。");
      return false;
    }

    setWork(result.data.work);
    setWorkTitleError("");
    return true;
  }

  function clearWorkTitleError() {
    setWorkTitleError("");
  }

  async function handleBookConsistencyCheck() {
    if (!workId || consistencyBusy) return;
    setConsistencyBusy(true);
    setConsistencyError("");
    setConsistencyNotice("");
    const result = await apiRequest<{ jobId?: string; status?: string; suggestions?: string[] }>(
      "/api/ai/chapter/consistency",
      { workId, scope: "book" },
      { method: "POST" },
    );
    setConsistencyBusy(false);
    if (!result.success) {
      setConsistencyError(result.message || "全书一致性检查创建失败。");
      return;
    }
    setConsistencyNotice(result.message || "全书一致性检查已创建。");
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setCommandQuery("");
        setOutlineRefineConfirmOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const headerChips = useMemo(() => {
    if (!work) return [] as HeaderChip[];

    const chips: HeaderChip[] = [];
    chips.push({ label: isShortStory ? "短篇小说" : "长篇连载", tone: "brand" });
    chips.push({ label: work.genreLabel || work.genreId, tone: "muted" });
    if (work.words) chips.push({ label: `目标 ${work.words}`, tone: "muted" });
    chips.push({ label: isShortStory ? "结构已就绪" : "大纲已就绪", tone: "brand" });
    return chips;
  }, [isShortStory, work]);

  const editedChapterCount = chapters.filter((chapter) => chapter.wordCount > 0).length;
  const targetChapterCount =
    work?.targetChapters ||
    (!isShortStory && hasOutlineField(outline, "targetChapters") && typeof outline.targetChapters === "number" ? outline.targetChapters : undefined) ||
    (!isShortStory && hasOutlineField(outline, "totalChapters") && typeof outline.totalChapters === "number" ? outline.totalChapters : undefined) ||
    maxChapterIndex ||
    chapters.length ||
    0;
  const plannedChapterCount = Math.max(
    work?.plannedUntilChapter || 0,
    hasOutlineField(outline, "plannedUntilChapter") && typeof outline.plannedUntilChapter === "number"
      ? outline.plannedUntilChapter
      : 0,
    maxChapterIndex,
    chapters.length,
  );
  const progressPercent = plannedChapterCount
    ? Math.min(100, Math.round((editedChapterCount / plannedChapterCount) * 100))
    : 0;
  const latestEditedChapter = chapters
    .slice()
    .filter((chapter) => chapter.wordCount > 0)
    .sort((left, right) => right.index - left.index)[0];
  const currentProgressChapter = hasActiveGeneration
    ? activeGeneration.index
    : Math.max(0, orderedNextChapterIndex - 1);
  const remainingBuffer = Math.max(0, plannedChapterCount - currentProgressChapter);
  const nextChapterExists = chapters.some((chapter) => chapter.index === orderedNextChapterIndex);
  const outlineExtensionState = canExtendPlanningWindow({
    targetChapters: targetChapterCount || plannedChapterCount,
    plannedUntilChapter: plannedChapterCount,
    writtenUntilChapter: currentProgressChapter,
  });
  const effectiveOutlineExtensionState = isShortStory
    ? { allowed: false, reason: "短篇小说已按场景拆分，无需规划下一段。" }
    : outlineExtensionState;

  const commandChapters = useMemo(() => {
    const normalized = commandQuery.trim().toLowerCase();
    const sorted = chapters.slice().sort((left, right) => left.index - right.index);

    if (!normalized) return sorted;

    return sorted.filter((chapter) => {
      const haystack = [
        chapter.index,
        isShortStory ? `场景${chapter.index}` : `第${chapter.index}章`,
        chapter.title ?? "",
        work?.title ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [chapters, commandQuery, isShortStory, work?.title]);

  return {
    activeGeneration,
    bootstrapLoading,
    chapters,
    commandChapters,
    commandOpen,
    commandQuery,
    consistencyBusy,
    consistencyError,
    consistencyNotice,
    currentProgressChapter,
    error,
    addChapterBusy,
    addChapterError,
    generatingNextChapter,
    goToChapter,
    handleAddChapter,
    handleLogout,
    handleBookConsistencyCheck,
    handleRefineOutline,
    hasActiveGeneration,
    headerChips,
    isAdmin,
    latestEditedChapter,
    loading,
    logoutBusy,
    maxChapterIndex,
    nextChapterExists,
    nextChapterIndex: orderedNextChapterIndex,
    openOutlineRefineConfirm,
    outlineExtensionSize,
    outlineExtensionState: effectiveOutlineExtensionState,
    openVolumeIndex,
    outline,
    outlineRefineBusy,
    outlineRefineConfirmOpen,
    outlineRefineError,
    outlineRefineSupplement,
    plannedChapterCount,
    progressPercent,
    remainingBuffer,
    setCommandOpen,
    setCommandQuery,
    setOutlineExtensionSize,
    setOpenVolumeIndex,
    setOutlineRefineConfirmOpen,
    setOutlineRefineSupplement,
    clearWorkTitleError,
    saveWorkTitle,
    targetChapterCount,
    userDisplayName,
    userEmail,
    work,
    workTitleError,
    workTitleSaving,
  };
}

export type WorkDashboardController = ReturnType<typeof useWorkDashboard>;

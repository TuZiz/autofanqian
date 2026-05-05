"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  ChaptersOverview,
  HeaderChip,
  SessionUser,
  WorkDetail,
} from "./work-dashboard-types";

export function useWorkDashboard(workId: string) {
  const router = useRouter();

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [nextChapterIndex, setNextChapterIndex] = useState(1);
  const [maxChapterIndex, setMaxChapterIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workTitleSaving, setWorkTitleSaving] = useState(false);
  const [workTitleError, setWorkTitleError] = useState("");
  const refreshAfterGenerationRef = useRef(false);
  const [openVolumeIndex, setOpenVolumeIndex] = useState<number | null>(0);
  const [outlineRefineBusy, setOutlineRefineBusy] = useState(false);
  const [outlineRefineError, setOutlineRefineError] = useState("");
  const [outlineRefineConfirmOpen, setOutlineRefineConfirmOpen] = useState(false);
  const [outlineRefineSupplement, setOutlineRefineSupplement] = useState("");
  const [outlineExtensionSize, setOutlineExtensionSize] = useState<PlanningPreset>("smart");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const outline = work?.outline;
  const activeGeneration = useActiveChapterGeneration(workId);
  const hasActiveGeneration = activeGeneration?.status === "running";
  const orderedNextChapterIndex =
    hasActiveGeneration && activeGeneration ? activeGeneration.index : nextChapterIndex;
  const generatingNextChapter =
    hasActiveGeneration && activeGeneration.index === orderedNextChapterIndex;

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
    chips.push({ label: work.genreLabel || work.genreId, tone: "muted" });
    if (work.words) chips.push({ label: `目标 ${work.words}`, tone: "muted" });
    chips.push({ label: "大纲已就绪", tone: "brand" });
    return chips;
  }, [work]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!workId) {
        setError("作品 ID 无效");
        setBootstrapLoading(false);
        return;
      }

      setLoading(true);

      const [sessionRes, workRes, chaptersRes] = await Promise.all([
        apiRequest<{ user: SessionUser }>("/api/auth/session"),
        apiRequest<{ work: WorkDetail }>(`/api/works/${encodeURIComponent(workId)}`),
        apiRequest<ChaptersOverview>(`/api/works/${encodeURIComponent(workId)}/chapters`),
      ]);

      if (cancelled) return;

      if (!sessionRes.success || !sessionRes.data?.user?.email) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(sessionRes.data.user.email);
      setIsAdmin(Boolean(sessionRes.data.user.isAdmin));

      if (workRes.success && workRes.data?.work) {
        setWork(workRes.data.work);
        setError("");
      } else {
        setWork(null);
        setError(workRes.message || "加载作品失败");
      }

      if (chaptersRes.success && chaptersRes.data?.chapters) {
        setChapters(chaptersRes.data.chapters);
        setNextChapterIndex(Math.max(1, chaptersRes.data.nextIndex || 1));
        setMaxChapterIndex(Math.max(0, chaptersRes.data.maxIndex || 0));
      } else {
        setChapters([]);
        setNextChapterIndex(1);
        setMaxChapterIndex(0);
      }

      setLoading(false);
      setBootstrapLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [workId]);

  useEffect(() => {
    if (hasActiveGeneration) {
      refreshAfterGenerationRef.current = true;
      return;
    }

    if (!refreshAfterGenerationRef.current || !workId) return;
    refreshAfterGenerationRef.current = false;

    let cancelled = false;

    async function refreshChapters() {
      const chaptersRes = await apiRequest<ChaptersOverview>(
        `/api/works/${encodeURIComponent(workId)}/chapters`,
      );

      if (cancelled) return;

      if (chaptersRes.success && chaptersRes.data?.chapters) {
        setChapters(chaptersRes.data.chapters);
        setNextChapterIndex(Math.max(1, chaptersRes.data.nextIndex || 1));
        setMaxChapterIndex(Math.max(0, chaptersRes.data.maxIndex || 0));
      }
    }

    void refreshChapters();

    return () => {
      cancelled = true;
    };
  }, [hasActiveGeneration, workId]);

  const editedChapterCount = chapters.filter((chapter) => chapter.wordCount > 0).length;
  const targetChapterCount =
    work?.targetChapters ||
    outline?.targetChapters ||
    outline?.totalChapters ||
    maxChapterIndex ||
    chapters.length ||
    0;
  const plannedChapterCount = Math.max(
    work?.plannedUntilChapter || 0,
    outline?.plannedUntilChapter || 0,
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

  const commandChapters = useMemo(() => {
    const normalized = commandQuery.trim().toLowerCase();
    const sorted = chapters.slice().sort((left, right) => left.index - right.index);

    if (!normalized) return sorted;

    return sorted.filter((chapter) => {
      const haystack = [
        chapter.index,
        `第${chapter.index}章`,
        chapter.title ?? "",
        work?.title ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [chapters, commandQuery, work?.title]);

  return {
    activeGeneration,
    bootstrapLoading,
    chapters,
    commandChapters,
    commandOpen,
    commandQuery,
    currentProgressChapter,
    error,
    generatingNextChapter,
    goToChapter,
    handleLogout,
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
    outlineExtensionState,
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
    userEmail,
    work,
    workTitleError,
    workTitleSaving,
  };
}

export type WorkDashboardController = ReturnType<typeof useWorkDashboard>;

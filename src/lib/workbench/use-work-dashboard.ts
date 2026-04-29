"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useActiveChapterGeneration,
  useChapterGenerationThinkingCopy,
} from "@/lib/client/chapter-generation";
import { apiRequest } from "@/lib/client/auth-api";
import type { StoryOutline } from "@/lib/create/outline-draft";

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
  const refreshAfterGenerationRef = useRef(false);
  const [openVolumeIndex, setOpenVolumeIndex] = useState<number | null>(0);
  const [outlineRefineBusy, setOutlineRefineBusy] = useState(false);
  const [outlineRefineError, setOutlineRefineError] = useState("");
  const [outlineRefineConfirmOpen, setOutlineRefineConfirmOpen] = useState(false);
  const [outlineRefineSupplement, setOutlineRefineSupplement] = useState("");
  const [outlineExtensionSize, setOutlineExtensionSize] = useState<20 | 40 | 60>(20);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const outline = work?.outline;
  const activeGeneration = useActiveChapterGeneration(workId);
  const hasActiveGeneration = activeGeneration?.status === "running";
  const orderedNextChapterIndex =
    hasActiveGeneration && activeGeneration ? activeGeneration.index : nextChapterIndex;
  const generatingNextChapter =
    hasActiveGeneration && activeGeneration.index === orderedNextChapterIndex;
  const generationThinking = useChapterGenerationThinkingCopy(Boolean(hasActiveGeneration));

  function goToChapter(index: number, options?: { autoAi?: boolean }) {
    if (!workId) return;
    const base = `/dashboard/work/${workId}/chapter/${index}`;
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

    const extensionInstruction = `本次希望向后延伸约${outlineExtensionSize}章，请优先补强未来${outlineExtensionSize}章的分卷结构、章节跨度、冲突推进和钩子密度。`;
    const finalSupplement = [extensionInstruction, supplement.trim()]
      .filter(Boolean)
      .join("\n");

    const result = await apiRequest<{ outline: StoryOutline }>("/api/ai/outline/refine", {
      workId,
      supplement: finalSupplement,
    });

    if (result.status === 401) {
      window.location.href = "/login";
      return;
    }

    const nextOutline = result.data?.outline;

    if (!result.success || !nextOutline) {
      setOutlineRefineError(result.message || "优化大纲失败，请稍后重试。");
      setOutlineRefineBusy(false);
      return;
    }

    setWork((current) => (current ? { ...current, outline: nextOutline } : current));
    setOutlineRefineConfirmOpen(false);
    setOutlineRefineSupplement("");
    setOutlineRefineBusy(false);
  }

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
  const totalChapterTarget = outline?.totalChapters || maxChapterIndex || chapters.length || 0;
  const plannedChapterCount = Math.max(totalChapterTarget, maxChapterIndex, chapters.length);
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
    commandChapters,
    commandOpen,
    commandQuery,
    currentProgressChapter,
    error,
    generationThinking,
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
    userEmail,
    work,
  };
}

export type WorkDashboardController = ReturnType<typeof useWorkDashboard>;

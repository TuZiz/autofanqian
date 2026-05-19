"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  ChapterListItem,
  ChaptersOverview,
  SessionUser,
  WorkDetail,
} from "./work-dashboard-types";
import { getWorkbenchUserDisplay } from "./user-display";

function applyChaptersOverview(
  overview: ChaptersOverview | undefined,
  setChapters: Dispatch<SetStateAction<ChapterListItem[]>>,
  setMaxChapterIndex: Dispatch<SetStateAction<number>>,
  setNextChapterIndex: Dispatch<SetStateAction<number>>,
) {
  if (overview?.chapters) {
    setChapters(overview.chapters);
    setNextChapterIndex(Math.max(1, overview.nextIndex || 1));
    setMaxChapterIndex(Math.max(0, overview.maxIndex || 0));
    return;
  }

  setChapters([]);
  setNextChapterIndex(1);
  setMaxChapterIndex(0);
}

export function useWorkDashboardBootstrap({
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
}: {
  hasActiveGeneration: boolean;
  setBootstrapLoading: Dispatch<SetStateAction<boolean>>;
  setChapters: Dispatch<SetStateAction<ChapterListItem[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setIsAdmin: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setMaxChapterIndex: Dispatch<SetStateAction<number>>;
  setNextChapterIndex: Dispatch<SetStateAction<number>>;
  setUserDisplayName: Dispatch<SetStateAction<string>>;
  setUserEmail: Dispatch<SetStateAction<string>>;
  setWork: Dispatch<SetStateAction<WorkDetail | null>>;
  workId: string;
}) {
  const refreshAfterGenerationRef = useRef(false);

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
      setUserDisplayName(getWorkbenchUserDisplay(sessionRes.data.user));
      setIsAdmin(Boolean(sessionRes.data.user.isAdmin));

      if (workRes.success && workRes.data?.work) {
        setWork(workRes.data.work);
        setError("");
      } else {
        setWork(null);
        setError(workRes.message || "加载作品失败");
      }

      applyChaptersOverview(
        chaptersRes.success ? chaptersRes.data : undefined,
        setChapters,
        setMaxChapterIndex,
        setNextChapterIndex,
      );

      setLoading(false);
      setBootstrapLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
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
  ]);

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

      if (chaptersRes.success) {
        applyChaptersOverview(
          chaptersRes.data,
          setChapters,
          setMaxChapterIndex,
          setNextChapterIndex,
        );
      }
    }

    void refreshChapters();

    return () => {
      cancelled = true;
    };
  }, [
    hasActiveGeneration,
    setChapters,
    setMaxChapterIndex,
    setNextChapterIndex,
    workId,
  ]);
}

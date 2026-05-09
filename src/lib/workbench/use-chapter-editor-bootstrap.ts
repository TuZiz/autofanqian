"use client";

import { useEffect } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import { normalizeChapterDraft } from "./chapter-editor-format";
import type {
  ChapterBootstrap,
  ChapterDetail,
  ChapterOverview,
  ChapterSessionUser,
} from "./chapter-editor-types";

export function useChapterEditorBootstrap({
  applyBootstrap,
  applyChapterOverview,
  applyMetaFromChapter,
  chapterIndex,
  setBootstrapLoading,
  setContent,
  setDirty,
  setDraftUnsynced,
  setError,
  setIsAdmin,
  setTitle,
  setUserEmail,
  workId,
}: {
  applyBootstrap: (payload: ChapterBootstrap) => void;
  applyChapterOverview: (payload: ChapterOverview) => void;
  applyMetaFromChapter: (chapter: ChapterDetail) => void;
  chapterIndex: number;
  setBootstrapLoading: (value: boolean) => void;
  setContent: (value: string) => void;
  setDirty: (value: boolean) => void;
  setDraftUnsynced: (value: boolean) => void;
  setError: (message: string) => void;
  setIsAdmin: (value: boolean) => void;
  setTitle: (value: string) => void;
  setUserEmail: (value: string) => void;
  workId: string;
}) {
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
        const draftRes = await apiRequest<{
          draft: {
            title: string | null;
            content: string;
            summary: string | null;
            chapterOutline: string | null;
            details: string[] | null;
            updatedAt: string;
            isSynced: boolean;
          } | null;
        }>(
          `/api/works/${encodeURIComponent(workId)}/chapters/${chapterIndex}/draft`,
          undefined,
          { method: "GET" },
        );
        if (!cancelled && draftRes.success && draftRes.data?.draft && !draftRes.data.draft.isSynced) {
          const draftUpdatedAt = new Date(draftRes.data.draft.updatedAt).getTime();
          const chapterUpdatedAt = new Date(chapterRes.data.chapter.updatedAt).getTime();
          if (draftUpdatedAt > chapterUpdatedAt && window.confirm("检测到未提交草稿，是否恢复到编辑器？")) {
            const normalized = normalizeChapterDraft({
              ...chapterRes.data.chapter,
              title: draftRes.data.draft.title,
              content: draftRes.data.draft.content,
            });
            setTitle(normalized.title);
            setContent(normalized.content);
            setDirty(true);
            setDraftUnsynced(true);
          }
        }
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
  }, [
    applyBootstrap,
    applyChapterOverview,
    applyMetaFromChapter,
    chapterIndex,
    setBootstrapLoading,
    setContent,
    setDirty,
    setDraftUnsynced,
    setError,
    setIsAdmin,
    setTitle,
    setUserEmail,
    workId,
  ]);
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import {
  AI_THINKING_COPY,
  DOTS,
  getOutlineStageTitle,
  safeJsonParse,
  type OutlineSessionUser,
  type OutlineStage,
} from "@/lib/create/outline-flow";
import {
  CREATE_OUTLINE_DRAFT_STORAGE_KEY,
  CREATE_OUTLINE_RESULT_CACHE_KEY,
  type CreateOutlineDraft,
  type StoryOutline,
} from "@/lib/create/outline-draft";

export function useCreateOutlineRedirect() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [stage, setStage] = useState<OutlineStage>("outline");
  const [status, setStatus] = useState<string>(aiZhCN.outline.preparing);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [dotsIndex, setDotsIndex] = useState(0);

  const progressIntervalRef = useRef<number | null>(null);
  const progressResetRef = useRef<number | null>(null);
  const thinkingIntervalRef = useRef<number | null>(null);
  const dotsIntervalRef = useRef<number | null>(null);

  const clearProgressTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (progressResetRef.current) {
      window.clearTimeout(progressResetRef.current);
      progressResetRef.current = null;
    }
  }, []);

  const clearThinkingTimer = useCallback(() => {
    if (thinkingIntervalRef.current) {
      window.clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
  }, []);

  const clearDotsTimer = useCallback(() => {
    if (dotsIntervalRef.current) {
      window.clearInterval(dotsIntervalRef.current);
      dotsIntervalRef.current = null;
    }
  }, []);

  const startThinkingLoop = useCallback(() => {
    clearThinkingTimer();
    setThinkingIndex(0);
    thinkingIntervalRef.current = window.setInterval(() => {
      setThinkingIndex((current) => (current + 1) % AI_THINKING_COPY.length);
    }, 1400);
  }, [clearThinkingTimer]);

  const stopThinkingLoop = useCallback(() => {
    clearThinkingTimer();
    setThinkingIndex(0);
  }, [clearThinkingTimer]);

  const startDotsLoop = useCallback(() => {
    clearDotsTimer();
    setDotsIndex(0);
    dotsIntervalRef.current = window.setInterval(() => {
      setDotsIndex((current) => (current + 1) % DOTS.length);
    }, 420);
  }, [clearDotsTimer]);

  const stopDotsLoop = useCallback(() => {
    clearDotsTimer();
    setDotsIndex(0);
  }, [clearDotsTimer]);

  const startProgress = useCallback(
    (cap: number, initial?: number) => {
      clearProgressTimers();
      setProgress((current) =>
        typeof initial === "number" ? Math.max(current, initial) : current,
      );

      progressIntervalRef.current = window.setInterval(() => {
        setProgress((current) => {
          const safeCap = Math.max(0, Math.min(98, cap));
          if (current >= safeCap) return current;
          const remaining = safeCap - current;
          const step = Math.min(1, Math.max(0.12, remaining * 0.04));
          return Math.min(safeCap, current + step);
        });
      }, 40);
    },
    [clearProgressTimers],
  );

  const finishProgress = useCallback(() => {
    clearProgressTimers();
    stopThinkingLoop();
    stopDotsLoop();
    setProgress(100);
    progressResetRef.current = window.setTimeout(() => {
      setProgress(0);
    }, 650);
  }, [clearProgressTimers, stopDotsLoop, stopThinkingLoop]);

  useEffect(() => {
    return () => {
      clearProgressTimers();
      clearThinkingTimer();
      clearDotsTimer();
    };
  }, [clearDotsTimer, clearProgressTimers, clearThinkingTimer]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setError("");
        setStage("outline");
        setStatus(aiZhCN.outline.generatingStatus);
        setProgress(0);
        startThinkingLoop();
        startDotsLoop();
        startProgress(88, 8);

        const session = await apiRequest<{ user: OutlineSessionUser }>("/api/auth/session");
        if (cancelled) return;

        if (!session.success || !session.data?.user?.email) {
          window.location.href = "/login";
          return;
        }

        setUserEmail(session.data.user.email);
        setIsAdmin(Boolean(session.data.user.isAdmin));

        const draft =
          safeJsonParse<CreateOutlineDraft>(
            sessionStorage.getItem(CREATE_OUTLINE_DRAFT_STORAGE_KEY),
          ) ?? null;

        if (!draft) {
          router.replace("/dashboard/create");
          return;
        }

        const outlineRes = await apiRequest<{ story: StoryOutline }>("/api/ai/outline", {
          genre: draft.genre,
          customGenreLabel: draft.genre === "custom" ? draft.genreLabel : undefined,
          customDetails: draft.genre === "custom" ? draft.customDetails : undefined,
          idea: draft.idea,
          tags: draft.tags,
          platform: draft.platform,
          dnaBookTitle: draft.dnaBookTitle,
          words: draft.words,
        });

        if (cancelled) return;

        if (!outlineRes.success || !outlineRes.data?.story) {
          setStage("error");
          stopThinkingLoop();
          stopDotsLoop();
          clearProgressTimers();
          setError(outlineRes.message || aiZhCN.outline.generateFailed);
          return;
        }

        setStage("work");
        setStatus(aiZhCN.outline.creatingWorkStatus);
        setProgress((current) => Math.max(current, 88));
        startProgress(96);
        const workRes = await apiRequest<{ workId: string }>("/api/works", {
          draft,
          story: outlineRes.data.story,
        });

        if (cancelled) return;

        if (!workRes.success || !workRes.data?.workId) {
          setStage("error");
          stopThinkingLoop();
          stopDotsLoop();
          clearProgressTimers();
          setError(workRes.message || "创建作品失败，请返回重试。");
          return;
        }

        const nextWorkId = workRes.data.workId;
        setStage("done");
        setStatus(aiZhCN.outline.doneStatus);
        finishProgress();

        try {
          sessionStorage.removeItem(CREATE_OUTLINE_DRAFT_STORAGE_KEY);
          sessionStorage.removeItem(CREATE_OUTLINE_RESULT_CACHE_KEY);
        } catch {
          // ignore
        }

        window.setTimeout(() => {
          if (cancelled) return;
          router.replace(`/dashboard/work/${nextWorkId}`);
        }, 220);
      } catch {
        setStage("error");
        stopThinkingLoop();
        stopDotsLoop();
        clearProgressTimers();
        setError(aiZhCN.common.networkFailed);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    clearProgressTimers,
    finishProgress,
    router,
    startDotsLoop,
    startProgress,
    startThinkingLoop,
    stopDotsLoop,
    stopThinkingLoop,
  ]);

  const progressValue = Math.max(0, Math.min(100, progress));

  return {
    dots: DOTS[dotsIndex] ?? "...",
    error,
    handleBackToCreate: () => router.replace("/dashboard/create"),
    isAdmin,
    progressLabelLeft: Math.min(97, Math.max(3, progressValue)),
    progressPercent: Math.round(progressValue),
    progressValue,
    showProgress: stage !== "done" && progress > 0 && !error,
    stage,
    status,
    thinkingCopy: AI_THINKING_COPY[thinkingIndex] ?? AI_THINKING_COPY[0],
    thinkingIndex,
    title: getOutlineStageTitle(stage),
    userEmail,
  };
}

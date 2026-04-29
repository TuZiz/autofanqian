"use client";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { apiRequest } from "@/lib/client/auth-api";
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

export default function DashboardCreateOutlineRedirectPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [stage, setStage] = useState<OutlineStage>("outline");
  const [status, setStatus] = useState("正在准备...");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [dotsIndex, setDotsIndex] = useState(0);

  const progressIntervalRef = useRef<number | null>(null);
  const progressResetRef = useRef<number | null>(null);
  const thinkingIntervalRef = useRef<number | null>(null);
  const dotsIntervalRef = useRef<number | null>(null);

  const dots = DOTS[dotsIndex] ?? "...";
  const thinkingCopy = AI_THINKING_COPY[thinkingIndex] ?? AI_THINKING_COPY[0];

  const showProgress = stage !== "done" && progress > 0 && !error;
  const progressValue = Math.max(0, Math.min(100, progress));
  const progressPercent = Math.round(progressValue);
  const progressLabelLeft = Math.min(97, Math.max(3, progressValue));

  const title = getOutlineStageTitle(stage);

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
        setStatus("大纲生成中，预计需要几秒到几十秒，请不要关闭页面。");
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
          setError(outlineRes.message || "生成大纲失败，请返回重新生成。");
          return;
        }

        setStage("work");
        setStatus("正在创建作品并写入数据库...");
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
        setStatus("已完成，即将进入作品页。");
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
        setError("网络请求异常，请稍后重试。");
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

  return (
    <main className="theme-page relative min-h-screen overflow-hidden bg-[#f5f6f2] font-sans transition-[background-color,color] dark:bg-[#0d1117]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <div className="relative z-10 min-h-screen">
        <DashboardTopbar
          title="作品工作台"
          userEmail={userEmail}
          isAdmin={isAdmin}
          showBackToDashboard
          backHref="/dashboard/create"
          backLabel="返回创意"
        />

        <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
          <div className="glass-panel rounded-lg p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="theme-chip rounded-md px-4 py-2 text-xs font-semibold">
                正在生成
              </span>
              <span className="theme-chip rounded-md px-4 py-2 text-xs font-semibold">
                请稍候
              </span>
              <span className="theme-chip-brand rounded-md px-4 py-2 text-xs font-semibold">
                大纲处理中
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="h-10 w-[min(720px,92%)] rounded-lg bg-slate-900/5 dark:bg-white/10" />
              <div className="h-4 w-[min(980px,96%)] rounded-md bg-slate-900/5 dark:bg-white/10" />
              <div className="h-4 w-[min(940px,90%)] rounded-md bg-slate-900/5 dark:bg-white/10" />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="theme-card-soft rounded-lg p-6 lg:col-span-2">
                <div className="h-6 w-32 rounded-md bg-slate-900/5 dark:bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-full rounded-md bg-slate-900/5 dark:bg-white/10" />
                  <div className="h-4 w-[92%] rounded-md bg-slate-900/5 dark:bg-white/10" />
                  <div className="h-4 w-[88%] rounded-md bg-slate-900/5 dark:bg-white/10" />
                </div>
              </div>
              <div className="theme-card-soft rounded-lg p-6">
                <div className="h-6 w-24 rounded-md bg-slate-900/5 dark:bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-lg bg-slate-900/5 dark:bg-white/10" />
                  <div className="h-10 w-full rounded-lg bg-slate-900/5 dark:bg-white/10" />
                  <div className="h-10 w-full rounded-lg bg-slate-900/5 dark:bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-[60] bg-white/55 backdrop-blur-md dark:bg-black/35" />

        <div className="absolute inset-0 z-[70] flex items-center justify-center px-4 py-10">
          <div className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-lg p-8 text-center shadow-sm sm:p-10">
            {stage === "done" || stage === "error" ? null : (
              <>
                <span className="pointer-events-none absolute left-0 top-0 z-0 h-full w-1.5 bg-slate-900/5 dark:bg-white/10" />
                <span className="pointer-events-none absolute left-0 top-0 z-0 h-[45%] w-1.5 bg-emerald-500 animate-[ai-progress-sweep_1.2s_ease-in-out_infinite] motion-reduce:animate-none" />
              </>
            )}

            <div className="relative z-10">
              <div className="mx-auto relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-slate-900 bg-slate-950 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950">
                {stage === "done" ? (
                  <CheckCircle2 className="relative h-4 w-4" />
                ) : (
                  <Sparkles className="relative h-4 w-4 animate-pulse" />
                )}
                <span className="relative">{stage === "done" ? "完成" : "生成中"}</span>
              </div>

              <h1
                key={stage}
                className="theme-heading mt-6 text-[clamp(2rem,3.2vw,2.8rem)] font-extrabold tracking-tight"
              >
                <span className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none">
                  {title}
                </span>
                {stage === "done" || stage === "error" ? null : (
                  <span className="inline-block w-10 text-left tabular-nums">{dots}</span>
                )}
              </h1>

              <p className="theme-subheading mt-4 text-sm leading-relaxed sm:text-base">
                {error ? error : status}
              </p>

              {showProgress ? (
                <div
                  className="mx-auto mt-8 max-w-xl"
                  role="progressbar"
                  aria-label="AI 生成进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                >
                  <div className="theme-muted flex items-center justify-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-300" />
                    <span
                      key={thinkingIndex}
                      className="animate-[ai-copy-swap_220ms_ease-out] motion-reduce:animate-none"
                    >
                      {thinkingCopy}
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-linear motion-reduce:animate-none"
                        style={{
                          width: `${progressValue}%`,
                          backgroundSize: "200% 100%",
                        }}
                      />
                    </div>
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-black/10 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur transition-[left] duration-300 ease-linear motion-reduce:transition-none dark:border-white/10 dark:bg-zinc-900/90 dark:text-white"
                      style={{ left: `${progressLabelLeft}%` }}
                    >
                      {progressPercent}%
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mx-auto mt-8 grid max-w-xl gap-2 text-left text-sm">
                <div className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 py-3">
                  <span className="theme-heading font-semibold">1. 生成大纲</span>
                  {stage === "outline" ? (
                    <span className="theme-chip rounded-md px-2.5 py-1 text-xs font-semibold">
                      进行中
                    </span>
                  ) : stage === "work" || stage === "done" ? (
                    <span className="theme-chip-brand rounded-md px-2.5 py-1 text-xs font-semibold">
                      已完成
                    </span>
                  ) : (
                    <span className="theme-chip rounded-md px-2.5 py-1 text-xs font-semibold">
                      失败
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-4 py-3">
                  <span className="theme-heading font-semibold">2. 创建作品</span>
                  {stage === "work" ? (
                    <span className="theme-chip rounded-md px-2.5 py-1 text-xs font-semibold">
                      进行中
                    </span>
                  ) : stage === "done" ? (
                    <span className="theme-chip-brand rounded-md px-2.5 py-1 text-xs font-semibold">
                      已完成
                    </span>
                  ) : stage === "outline" ? (
                    <span className="theme-chip rounded-md px-2.5 py-1 text-xs font-semibold">
                      等待中
                    </span>
                  ) : (
                    <span className="theme-chip rounded-md px-2.5 py-1 text-xs font-semibold">
                      失败
                    </span>
                  )}
                </div>

                {stage === "error" ? (
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      className="theme-button-secondary rounded-lg px-5 py-2 text-sm font-semibold"
                      onClick={() => router.replace("/dashboard/create")}
                    >
                      返回创意页
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

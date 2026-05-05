"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";

export const CHAPTER_AI_THINKING_COPY = aiZhCN.chapterGenerate.thinking;

export type ChapterGenerationStatus = "running" | "done" | "error";
export type ChapterGenerationStage =
  | "prepare"
  | "context"
  | "draft"
  | "polish"
  | "finalize";

export type ChapterGenerationResult = {
  work: {
    id: string;
    title: string;
    tag: string;
  };
  chapter: {
    id: string;
    index: number;
    title: string | null;
    content: string;
    wordCount: number;
    summary?: string | null;
    chapterOutline?: string | null;
    details?: string[];
    updatedAt: string;
    createdAt: string;
  };
};

export type ChapterGenerationSnapshot = {
  key: string;
  workId: string;
  index: number;
  status: ChapterGenerationStatus;
  stage?: ChapterGenerationStage;
  progress: number;
  startedAt: number;
  updatedAt: number;
  message?: string;
  error?: string;
  result?: ChapterGenerationResult;
};

type ChapterGenerationStore = Record<string, ChapterGenerationSnapshot>;

const STORAGE_KEY = "iwriter.chapterGeneration.v1";
const CHANGE_EVENT = "iwriter:chapter-generation-change";
const RUNNING_TTL_MS = 30 * 60 * 1000;
const FINISHED_TTL_MS = 2_500;

const inFlight = new Map<string, Promise<
  | { success: true; status: number; data: ChapterGenerationResult }
  | { success: false; status?: number; message: string }
>>();
const progressTimers = new Map<string, number>();
const cleanupTimers = new Map<string, number>();

const CHAPTER_GENERATION_STAGE_META: Record<
  ChapterGenerationStage,
  { index: number; label: string }
> = {
  prepare: { index: 0, label: aiZhCN.chapterGenerate.stages.prepare },
  context: { index: 1, label: aiZhCN.chapterGenerate.stages.context },
  draft: { index: 2, label: aiZhCN.chapterGenerate.stages.draft },
  polish: { index: 3, label: aiZhCN.chapterGenerate.stages.polish },
  finalize: { index: 4, label: aiZhCN.chapterGenerate.stages.finalize },
};

export function getChapterGenerationKey(workId: string, index: number) {
  return `${workId}:${index}`;
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function readStore(): ChapterGenerationStore {
  if (!canUseBrowserStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as ChapterGenerationStore;
    const now = Date.now();
    const next: ChapterGenerationStore = {};

    for (const [key, snapshot] of Object.entries(parsed)) {
      if (!snapshot || snapshot.key !== key || !snapshot.workId) continue;
      if (!Number.isFinite(snapshot.index) || snapshot.index <= 0) continue;

      const age = now - snapshot.updatedAt;
      if (snapshot.status === "running" && now - snapshot.startedAt > RUNNING_TTL_MS) {
        continue;
      }

      if (snapshot.status !== "running" && age > FINISHED_TTL_MS) {
        continue;
      }

      next[key] = {
        ...snapshot,
        progress: clampProgress(snapshot.progress),
      };
    }

    return next;
  } catch {
    return {};
  }
}

function writeStore(store: ChapterGenerationStore) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore localStorage failures
  }
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function setSnapshot(snapshot: ChapterGenerationSnapshot) {
  const store = readStore();
  store[snapshot.key] = {
    ...snapshot,
    progress: clampProgress(snapshot.progress),
    updatedAt: Date.now(),
  };
  writeStore(store);
  emitChange();
}

function removeSnapshot(key: string) {
  const store = readStore();
  if (!store[key]) return;

  delete store[key];
  writeStore(store);
  emitChange();
}

function clearProgressTimer(key: string) {
  const timer = progressTimers.get(key);
  if (!timer) return;
  window.clearInterval(timer);
  progressTimers.delete(key);
}

function clearCleanupTimer(key: string) {
  const timer = cleanupTimers.get(key);
  if (!timer) return;
  window.clearTimeout(timer);
  cleanupTimers.delete(key);
}

function scheduleSnapshotCleanup(key: string) {
  if (typeof window === "undefined") return;

  clearCleanupTimer(key);
  const timer = window.setTimeout(() => {
    cleanupTimers.delete(key);
    removeSnapshot(key);
  }, FINISHED_TTL_MS);
  cleanupTimers.set(key, timer);
}

function getRunningGenerationStage(
  elapsed: number,
  progress: number,
): ChapterGenerationStage {
  if (progress >= 90 || elapsed >= 22_000) return "finalize";
  if (progress >= 72 || elapsed >= 14_000) return "polish";
  if (progress >= 38 || elapsed >= 6_000) return "draft";
  if (progress >= 18 || elapsed >= 2_000) return "context";
  return "prepare";
}

function getGenerationStageLabel(stage: ChapterGenerationStage) {
  return CHAPTER_GENERATION_STAGE_META[stage].label;
}

function getGenerationStageIndex(stage?: ChapterGenerationStage) {
  if (!stage) return 0;
  return CHAPTER_GENERATION_STAGE_META[stage]?.index ?? 0;
}

function ensureProgressTimer(snapshot: ChapterGenerationSnapshot) {
  if (typeof window === "undefined") return;
  if (snapshot.status !== "running") return;
  if (progressTimers.has(snapshot.key)) return;

  progressTimers.set(
    snapshot.key,
    window.setInterval(() => {
      const current = readStore()[snapshot.key];
      if (!current || current.status !== "running") {
        clearProgressTimer(snapshot.key);
        return;
      }

      const elapsed = Date.now() - current.startedAt;
      const eased = 1 - Math.exp(-elapsed / 22_000);
      const nextProgress = Math.min(96, Math.max(current.progress, 10 + eased * 86));
      const nextStage = getRunningGenerationStage(elapsed, nextProgress);

      setSnapshot({
        ...current,
        stage: nextStage,
        progress: nextProgress,
        message: getGenerationStageLabel(nextStage),
      });
    }, 320),
  );
}

export function getChapterGenerationSnapshot(workId: string, index: number) {
  if (!workId || !Number.isFinite(index) || index <= 0) return null;
  return readStore()[getChapterGenerationKey(workId, index)] ?? null;
}

export function getActiveChapterGeneration(workId?: string) {
  const snapshots = Object.values(readStore())
    .filter((item) => item.status === "running")
    .filter((item) => !workId || item.workId === workId)
    .sort((left, right) => right.startedAt - left.startedAt);

  return snapshots[0] ?? null;
}

export function subscribeChapterGeneration(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useChapterGeneration(workId: string, index: number) {
  useSyncExternalStore(
    subscribeChapterGeneration,
    () => {
      const snapshot = getChapterGenerationSnapshot(workId, index);
      if (!snapshot) return "";
      return `${snapshot.key}:${snapshot.status}:${Math.round(snapshot.progress)}:${snapshot.updatedAt}`;
    },
    () => "",
  );

  const snapshot = getChapterGenerationSnapshot(workId, index);

  useEffect(() => {
    if (snapshot?.status === "running") {
      ensureProgressTimer(snapshot);
    }
  }, [snapshot]);

  return snapshot;
}

export function useActiveChapterGeneration(workId?: string) {
  useSyncExternalStore(
    subscribeChapterGeneration,
    () => {
      const snapshot = getActiveChapterGeneration(workId);
      if (!snapshot) return "";
      return `${snapshot.key}:${snapshot.status}:${Math.round(snapshot.progress)}:${snapshot.updatedAt}`;
    },
    () => "",
  );

  const snapshot = getActiveChapterGeneration(workId);

  useEffect(() => {
    if (snapshot?.status === "running") {
      ensureProgressTimer(snapshot);
    }
  }, [snapshot]);

  return snapshot;
}

export function useChapterGenerationThinkingCopy(
  snapshot?: Pick<ChapterGenerationSnapshot, "status" | "stage" | "message"> | null,
) {
  return useMemo(
    () => ({
      copy:
        snapshot?.message?.trim() ||
        CHAPTER_AI_THINKING_COPY[0],
      index: getGenerationStageIndex(snapshot?.stage),
    }),
    [snapshot?.message, snapshot?.stage],
  );
}

export function startChapterGeneration(params: {
  workId: string;
  index: number;
  extraPrompt?: string;
}): Promise<
  | { success: true; status: number; data: ChapterGenerationResult }
  | { success: false; status?: number; message: string }
> {
  const { workId, index, extraPrompt } = params;
  const key = getChapterGenerationKey(workId, index);
  const current = getChapterGenerationSnapshot(workId, index);

  if (current?.status === "running" && inFlight.has(key)) {
    return inFlight.get(key)!;
  }

  if (current?.status === "running") {
    return Promise.resolve({
      success: false,
      status: 409,
      message: aiZhCN.common.chapterRunning,
    });
  }

  clearCleanupTimer(key);

  const now = Date.now();
  const snapshot: ChapterGenerationSnapshot = {
    key,
    workId,
    index,
    status: "running",
    stage: "prepare",
    progress: 8,
    startedAt: now,
    updatedAt: now,
    message: getGenerationStageLabel("prepare"),
  };

  setSnapshot(snapshot);
  ensureProgressTimer(snapshot);

  const request = apiRequest<ChapterGenerationResult>("/api/ai/chapter", {
    workId,
    index,
    extraPrompt: extraPrompt?.trim() || undefined,
  })
    .then((response) => {
      if (response.success && response.data) {
        clearProgressTimer(key);
        setSnapshot({
          ...snapshot,
          status: "done",
          stage: "finalize",
          progress: 100,
          message: aiZhCN.chapterGenerate.doneApplied,
          result: response.data,
        });
        scheduleSnapshotCleanup(key);
        return {
          success: true as const,
          status: response.status ?? 200,
          data: response.data,
        };
      }

      clearProgressTimer(key);
      const message = response.message || aiZhCN.chapterGenerate.failed;
      setSnapshot({
        ...snapshot,
        status: "error",
        progress: 0,
        error: message,
        message,
      });
      scheduleSnapshotCleanup(key);
      return {
        success: false as const,
        status: response.status,
        message,
      };
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

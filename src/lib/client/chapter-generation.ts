"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { apiRequest, type AuthApiResponse } from "@/lib/client/auth-api";

export const CHAPTER_AI_THINKING_COPY = [
  "AI 生成中...",
  "文本较长...",
  "请等待...",
] as const;

export type ChapterGenerationStatus = "running" | "done" | "error";

export type ChapterGenerationSnapshot = {
  key: string;
  workId: string;
  index: number;
  status: ChapterGenerationStatus;
  progress: number;
  startedAt: number;
  updatedAt: number;
  error?: string;
};

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

type ChapterGenerationStore = Record<string, ChapterGenerationSnapshot>;

const STORAGE_KEY = "iwriter.chapterGeneration.v1";
const CHANGE_EVENT = "iwriter:chapter-generation-change";
const RUNNING_TTL_MS = 30 * 60 * 1000;
const FINISHED_TTL_MS = 2_000;

const inFlight = new Map<string, Promise<AuthApiResponse<ChapterGenerationResult>>>();
const progressTimers = new Map<string, number>();
const cleanupTimers = new Map<string, number>();

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
    // Storage can be unavailable in private modes; in-memory events still keep the UI synced.
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
  if (timer) {
    window.clearInterval(timer);
    progressTimers.delete(key);
  }
}

function scheduleSnapshotCleanup(key: string) {
  const existing = cleanupTimers.get(key);
  if (existing) {
    window.clearTimeout(existing);
  }

  const timer = window.setTimeout(() => {
    cleanupTimers.delete(key);
    removeSnapshot(key);
  }, FINISHED_TTL_MS);

  cleanupTimers.set(key, timer);
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
      const eased = 1 - Math.exp(-elapsed / 28_000);
      const nextProgress = Math.min(96, Math.max(current.progress, 8 + eased * 88));

      setSnapshot({
        ...current,
        progress: nextProgress,
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
    .sort((a, b) => b.startedAt - a.startedAt);

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

export function useChapterGenerationThinkingCopy(active: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % CHAPTER_AI_THINKING_COPY.length);
    }, 1400);

    return () => {
      window.clearInterval(timer);
    };
  }, [active]);

  return useMemo(
    () => ({
      copy: CHAPTER_AI_THINKING_COPY[active ? index : 0] ?? CHAPTER_AI_THINKING_COPY[0],
      index: active ? index : 0,
    }),
    [active, index],
  );
}

export function startChapterGeneration(params: {
  workId: string;
  index: number;
  extraPrompt?: string;
}): Promise<AuthApiResponse<ChapterGenerationResult>> {
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
      message: "该章节正在生成中，请等待生成结束后再操作。",
    });
  }

  const now = Date.now();
  const snapshot: ChapterGenerationSnapshot = {
    key,
    workId,
    index,
    status: "running",
    progress: 8,
    startedAt: now,
    updatedAt: now,
  };

  setSnapshot(snapshot);
  ensureProgressTimer(snapshot);

  const request = apiRequest<ChapterGenerationResult>("/api/ai/chapter", {
    workId,
    index,
    extraPrompt: extraPrompt?.trim() || undefined,
  }).then((response) => {
    if (response.success) {
      clearProgressTimer(key);
      setSnapshot({
        ...snapshot,
        status: "done",
        progress: 100,
      });
      scheduleSnapshotCleanup(key);
      return response;
    }

    if (response.status === 409) {
      const running = getChapterGenerationSnapshot(workId, index);
      if (running?.status === "running") return response;

      const retrySnapshot: ChapterGenerationSnapshot = {
        ...snapshot,
        status: "running",
        progress: Math.max(12, snapshot.progress),
        updatedAt: Date.now(),
      };
      setSnapshot(retrySnapshot);
      ensureProgressTimer(retrySnapshot);
      return response;
    }

    clearProgressTimer(key);
    setSnapshot({
      ...snapshot,
      status: "error",
      progress: 0,
      error: response.message,
    });
    scheduleSnapshotCleanup(key);
    return response;
  }).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  return request;
}

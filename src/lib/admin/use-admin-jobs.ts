"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

export type AdminJobStatus =
  | "all"
  | "queued"
  | "running"
  | "succeeded"
  | "success"
  | "failed"
  | "cancelled"
  | "stale";

export type AdminGenerationJob = {
  id: string;
  action: string;
  jobType: string | null;
  status: Exclude<AdminJobStatus, "all">;
  resultSummary: string | null;
  errorMessage: string | null;
  chapterIndex: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
  completedAt: string | null;
  novel: { id: string; title: string; workType: string } | null;
  user: { email: string } | null;
};

export type AdminJobsResponse = {
  jobs: AdminGenerationJob[];
  counts: Array<{ status: string; count: number }>;
};

export function useAdminJobs() {
  const [jobs, setJobs] = useState<AdminGenerationJob[]>([]);
  const [counts, setCounts] = useState<AdminJobsResponse["counts"]>([]);
  const [status, setStatus] = useState<AdminJobStatus>("all");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of counts) map.set(item.status, item.count);
    return map;
  }, [counts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await apiRequest<AdminJobsResponse>(
      `/api/admin/jobs?status=${encodeURIComponent(status)}&take=80`,
    );
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.message || "任务列表加载失败。");
      return;
    }
    setJobs(response.data.jobs);
    setCounts(response.data.counts);
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const runPending = useCallback(
    async (jobId?: string) => {
      if (running) return;
      setRunning(true);
      setError("");
      setNotice("");
      const response = await apiRequest<{
        scanned: number;
        results: Array<{ jobId: string; status: string; message?: string }>;
      }>(
        "/api/admin/jobs/run-pending",
        jobId ? { jobId, limit: 1 } : { limit: 5 },
        { method: "POST" },
      );
      setRunning(false);
      if (!response.success) {
        setError(response.message || "任务执行失败。");
        return;
      }
      setNotice(
        response.message ||
          `已处理 ${response.data?.results.length ?? 0} 个任务。`,
      );
      await load();
    },
    [load, running],
  );

  return {
    countMap,
    error,
    jobs,
    load,
    loading,
    notice,
    runPending,
    running,
    setStatus,
    status,
  };
}

export type AdminJobsController = ReturnType<typeof useAdminJobs>;

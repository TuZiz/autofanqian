"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  GenerationLogsResponse,
  GenerationLogStatusFilter,
} from "@/lib/admin/generation-log-types";
import { apiRequest } from "@/lib/client/auth-api";

export type GenerationLogsController = ReturnType<typeof useGenerationLogs>;

export function useGenerationLogs() {
  const [status, setStatus] = useState<GenerationLogStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [take, setTake] = useState<20 | 50 | 100>(50);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<GenerationLogsResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const jobs = data?.jobs ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.counts ?? []) {
      map.set(item.status, item.count);
    }
    return map;
  }, [data?.counts]);

  const load = useCallback(
    async (options: { append?: boolean; cursor?: string | null } = {}) => {
      const requestId = (requestIdRef.current += 1);
      if (options.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const params = new URLSearchParams({
        status,
        take: String(take),
      });
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (options.cursor) params.set("cursor", options.cursor);

      const response = await apiRequest<GenerationLogsResponse>(
        `/api/admin/generation-logs?${params.toString()}`,
      );

      if (requestId !== requestIdRef.current) return;

      setLoading(false);
      setLoadingMore(false);

      if (!response.success || !response.data) {
        setError(response.message || "生成日志加载失败。");
        return;
      }

      setData((current) => {
        if (!options.append || !current) return response.data ?? null;
        if (!response.data) return current;
        return {
          ...response.data,
          jobs: [...current.jobs, ...response.data.jobs],
        };
      });
    },
    [query, status, take],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const refresh = useCallback(() => load(), [load]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    void load({ append: true, cursor: nextCursor });
  }, [load, loadingMore, nextCursor]);

  const updateStatus = useCallback((nextStatus: GenerationLogStatusFilter) => {
    setStatus(nextStatus);
  }, []);

  const updateTake = useCallback((nextTake: 20 | 50 | 100) => {
    setTake(nextTake);
  }, []);

  return {
    autoRefresh,
    countMap,
    data,
    error,
    jobs,
    loadMore,
    loading,
    loadingMore,
    nextCursor,
    query,
    refresh,
    selectedJobId,
    setAutoRefresh,
    setQuery,
    setSelectedJobId,
    setStatus: updateStatus,
    setTake: updateTake,
    status,
    take,
  };
}

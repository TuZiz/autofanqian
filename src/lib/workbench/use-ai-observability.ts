"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { WorkAiObservabilityData } from "@/lib/workbench/ai-observability-types";

export type AiObservabilityFilters = {
  from: string;
  to: string;
  trendLimit: number;
  modelMinJobs: number;
  chapterLimit: number;
};

const DEFAULT_FILTERS: AiObservabilityFilters = {
  from: "",
  to: "",
  trendLimit: 30,
  modelMinJobs: 1,
  chapterLimit: 100,
};

function appendParam(searchParams: URLSearchParams, key: string, value: string | number) {
  if (value === "" || value == null) return;
  searchParams.set(key, String(value));
}

export function useAiObservability(workId: string) {
  const [filters, setFilters] = useState<AiObservabilityFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AiObservabilityFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<WorkAiObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const requestUrl = useMemo(() => {
    const searchParams = new URLSearchParams();
    appendParam(searchParams, "trendLimit", appliedFilters.trendLimit);
    appendParam(searchParams, "modelMinJobs", appliedFilters.modelMinJobs);
    appendParam(searchParams, "chapterLimit", appliedFilters.chapterLimit);
    appendParam(searchParams, "from", appliedFilters.from);
    appendParam(searchParams, "to", appliedFilters.to);
    return `/api/workbench/works/${encodeURIComponent(workId)}/ai-observability?${searchParams.toString()}`;
  }, [appliedFilters, workId]);

  const applyFilters = useCallback(() => {
    setLoading(true);
    setError("");
    setAppliedFilters({
      from: filters.from,
      to: filters.to,
      trendLimit: Math.max(1, Math.min(100, Math.floor(filters.trendLimit || 30))),
      modelMinJobs: Math.max(1, Math.min(100, Math.floor(filters.modelMinJobs || 1))),
      chapterLimit: Math.max(1, Math.min(300, Math.floor(filters.chapterLimit || 100))),
    });
  }, [filters]);

  const resetFilters = useCallback(() => {
    setLoading(true);
    setError("");
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!workId) return;
    let cancelled = false;

    apiRequest<WorkAiObservabilityData>(requestUrl, undefined, {
      redirectOnUnauthorized: true,
    }).then((response) => {
      if (cancelled) return;
      if (response.success && response.data) {
        setData(response.data);
        setError("");
      } else {
        setError(response.message || "AI 观测数据加载失败。");
      }
    }).catch(() => {
      if (!cancelled) setError("AI 观测数据加载失败。");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [requestUrl, refreshNonce, workId]);

  return {
    appliedFilters,
    data,
    error,
    filters,
    loading,
    applyFilters,
    refresh,
    resetFilters,
    setFilters,
  };
}

"use client";

import { useEffect, useState } from "react";

import type { GenerationLogDetailResponse } from "@/lib/admin/generation-log-types";
import { apiRequest } from "@/lib/client/auth-api";

export function useGenerationLogDetail(jobId: string | null) {
  const [data, setData] = useState<GenerationLogDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!jobId) {
        setData(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      const response = await apiRequest<GenerationLogDetailResponse>(
        `/api/admin/generation-logs/${encodeURIComponent(jobId)}`,
      );

      if (cancelled) return;
      setLoading(false);

      if (!response.success || !response.data) {
        setError(response.message || "日志详情加载失败。");
        setData(null);
        return;
      }

      setData(response.data);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return {
    data,
    error,
    loading,
  };
}

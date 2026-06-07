"use client";

import { useEffect, useState } from "react";

import type { AdminUserDetailResponse } from "@/lib/admin/admin-user-types";
import { apiRequest } from "@/lib/client/auth-api";

export function useAdminUserDetail(userId: string | null) {
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setData(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      const response = await apiRequest<AdminUserDetailResponse>(
        `/api/admin/users/${encodeURIComponent(userId)}`,
      );

      if (cancelled) return;
      setLoading(false);

      if (!response.success || !response.data) {
        setError(response.message || "用户详情加载失败。");
        setData(null);
        return;
      }

      setData(response.data);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    data,
    error,
    loading,
  };
}

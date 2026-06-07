"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { AiStats, SessionUser } from "./dashboard-admin-types";

export function useAdminMonitor() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [aiStats, setAiStats] = useState<AiStats | null>(null);
  const [aiStatsLoading, setAiStatsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await apiRequest<{ user: SessionUser }>("/api/auth/session");
      if (cancelled) return;

      if (!session.success || !session.data?.user) {
        window.location.href = "/login";
        return;
      }

      if (!session.data.user.isAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setUser(session.data.user);
      setAiStatsLoading(true);

      const statsRes = await apiRequest<AiStats>("/api/admin/ai-stats");

      if (!cancelled) {
        setAiStatsLoading(false);
        setAiStats(statsRes.success && statsRes.data ? statsRes.data : null);
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefreshAiStats = useCallback(async () => {
    setAiStatsLoading(true);
    const res = await apiRequest<AiStats>("/api/admin/ai-stats");
    setAiStatsLoading(false);

    if (!res.success || !res.data) {
      window.alert(res.message || "加载统计失败");
      return;
    }

    setAiStats(res.data);
  }, []);

  return {
    activeSection,
    aiStats,
    aiStatsLoading,
    handleRefreshAiStats,
    loading,
    setActiveSection,
    user,
  };
}

export type AdminMonitorController = ReturnType<typeof useAdminMonitor>;

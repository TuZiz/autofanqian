"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { AdminAuditLogItem, SessionUser } from "./dashboard-admin-types";

export function useAdminLogs() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

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
      setAuditLogsLoading(true);

      const auditRes = await apiRequest<{ logs: AdminAuditLogItem[] }>("/api/admin/audit-logs?take=50");

      if (!cancelled) {
        setAuditLogsLoading(false);
        setAuditLogs(auditRes.success && auditRes.data?.logs ? auditRes.data.logs : []);
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefreshAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    const res = await apiRequest<{ logs: AdminAuditLogItem[] }>("/api/admin/audit-logs?take=50");
    setAuditLogsLoading(false);

    if (!res.success || !res.data) {
      window.alert(res.message || "加载审计日志失败");
      return;
    }

    setAuditLogs(res.data.logs);
  }, []);

  const selectedLog = auditLogs.find((log) => log.id === selectedLogId) ?? null;

  const filteredLogs = searchQuery
    ? auditLogs.filter(
        (log) =>
          log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.targetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (log.targetId ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : auditLogs;

  return {
    auditLogs,
    auditLogsLoading,
    filteredLogs,
    handleRefreshAuditLogs,
    loading,
    searchQuery,
    selectedLog,
    selectedLogId,
    setSearchQuery,
    setSelectedLogId,
    user,
  };
}

export type AdminLogsController = ReturnType<typeof useAdminLogs>;

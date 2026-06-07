"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  DashboardFilters,
  DashboardOverview,
  DashboardWork,
  SessionUser,
} from "./dashboard-types";

const DEFAULT_FILTERS: DashboardFilters = {
  q: "",
  genreId: "",
  tag: "",
  owner: "",
  type: "all",
  sort: "updated_desc",
  page: 1,
  pageSize: 80,
};

function buildWorksUrl(nextFilters: DashboardFilters) {
  const params = new URLSearchParams();
  if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());
  if (nextFilters.genreId.trim()) params.set("genreId", nextFilters.genreId.trim());
  if (nextFilters.tag.trim()) params.set("tag", nextFilters.tag.trim());
  if (nextFilters.owner.trim()) params.set("owner", nextFilters.owner.trim());
  if (nextFilters.type !== "all") params.set("type", nextFilters.type);
  if (nextFilters.sort) params.set("sort", nextFilters.sort);
  params.set("page", String(nextFilters.page));
  params.set("pageSize", String(nextFilters.pageSize));
  const query = params.toString();
  return query ? `/api/works?${query}` : "/api/works";
}

function normalizeDeleteConfirmationValue(value: string) {
  const normalized = value.trim().replace(/[\s\u3000]+/g, " ");
  if (normalized.startsWith("\u300a") && normalized.endsWith("\u300b") && normalized.length > 2) {
    return normalized.slice(1, -1).trim().replace(/[\s\u3000]+/g, " ");
  }

  return normalized;
}

export function useDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; title: string }>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isFilterPending, startFilterTransition] = useTransition();

  const legacyDeleteConfirmed = useMemo(() => {
    const normalized = deleteConfirmInput.trim().toLowerCase();
    return normalized === "delete" || normalized === "删除" || normalized === "鍒犻櫎";
  }, [deleteConfirmInput]);

  const deleteConfirmed = useMemo(() => {
    if (!deleteTarget) return false;

    const normalizedInput = normalizeDeleteConfirmationValue(deleteConfirmInput);
    const normalizedTitle = normalizeDeleteConfirmationValue(deleteTarget.title);
    const legacyKeyword = normalizedInput.toLowerCase();

    return (
      normalizedInput === normalizedTitle ||
      legacyKeyword === "delete" ||
      legacyKeyword === "\u5220\u9664" ||
      legacyDeleteConfirmed
    );
  }, [deleteConfirmInput, deleteTarget, legacyDeleteConfirmed]);

  const bootstrapReadyRef = useRef(false);
  const overviewRequestIdRef = useRef(0);

  const loadOverview = useCallback(async (nextFilters: DashboardFilters) => {
    const requestId = overviewRequestIdRef.current + 1;
    overviewRequestIdRef.current = requestId;
    setOverviewLoading(true);
    setOverviewError("");

    const response = await apiRequest<DashboardOverview>(buildWorksUrl(nextFilters));
    if (overviewRequestIdRef.current !== requestId) return;

    if (response.success && response.data) {
      setOverview(response.data);
    } else {
      setOverview(null);
      setOverviewError(response.message || "作品列表加载失败");
    }

    setOverviewLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const sessionResponse = await apiRequest<{ user: SessionUser }>("/api/auth/session");
        if (cancelled) return;

        if (!sessionResponse.success || !sessionResponse.data?.user) {
          window.location.href = "/login";
          return;
        }

        setUser(sessionResponse.data.user);
        await loadOverview(DEFAULT_FILTERS);
        if (cancelled) return;
        setLoading(false);
        bootstrapReadyRef.current = true;
      } catch {
        if (!cancelled) {
          window.location.href = "/login";
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!bootstrapReadyRef.current) return;
    void loadOverview(filters);
  }, [filters, loadOverview]);

  const refreshOverview = useCallback(async () => {
    await loadOverview(filters);
    return true;
  }, [filters, loadOverview]);

  const updateFilters = useCallback((next: Partial<DashboardFilters>) => {
    startFilterTransition(() => {
      setFilters((current) => ({
        ...current,
        ...next,
        page: next.page ?? 1,
      }));
    });
  }, []);

  const openDeleteDialog = useCallback((work: DashboardWork) => {
    setDeleteTarget({ id: work.id, title: work.title });
    setDeleteConfirmInput("");
    setDeleteError("");
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteConfirmInput("");
    setDeleteError("");
  }, [deleteBusy]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteBusy || !deleteConfirmed) return;

    setDeleteBusy(true);
    setDeleteError("");

    const response = await apiRequest<{ deleted: { id: string } }>(
      `/api/works/${deleteTarget.id}`,
      undefined,
      { method: "DELETE" },
    );

    if (response.success) {
      setDeleteTarget(null);
      setDeleteConfirmInput("");
      setDeleteBusy(false);
      await loadOverview(filters);
      return;
    }

    setDeleteError(response.message || "删除失败，请稍后再试。");
    setDeleteBusy(false);
  }, [deleteBusy, deleteConfirmed, deleteTarget, filters, loadOverview]);

  const handleLogout = useCallback(async () => {
    if (logoutBusy) return;

    setLogoutBusy(true);
    try {
      const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});

      if (response.success && response.data?.redirectTo) {
        window.location.href = response.data.redirectTo;
      }
    } finally {
      setLogoutBusy(false);
    }
  }, [logoutBusy]);

  const updateUser = useCallback((nextUser: SessionUser) => {
    setUser((current) => ({
      ...(current ?? nextUser),
      ...nextUser,
    }));
  }, []);

  return {
    closeDeleteDialog,
    deleteBusy,
    deleteConfirmInput,
    deleteConfirmed,
    deleteError,
    deleteTarget,
    filters,
    handleConfirmDelete,
    handleLogout,
    isFilterPending,
    loading,
    logoutBusy,
    openDeleteDialog,
    overview,
    overviewError,
    overviewLoading,
    refreshOverview,
    setDeleteConfirmInput,
    updateFilters,
    updateUser,
    user,
  };
}

export type DashboardClientController = ReturnType<typeof useDashboardClient>;

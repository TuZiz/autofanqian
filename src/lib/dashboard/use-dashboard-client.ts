"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { DashboardOverview, DashboardWork, SessionUser } from "./dashboard-types";

export function useDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; title: string }>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const deleteConfirmed = useMemo(() => {
    const normalized = deleteConfirmInput.trim().toLowerCase();
    return normalized === "delete" || normalized === "删除";
  }, [deleteConfirmInput]);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const [sessionResponse, worksResponse] = await Promise.all([
          apiRequest<{ user: SessionUser }>("/api/auth/session"),
          apiRequest<DashboardOverview>("/api/works"),
        ]);

        if (!cancelled && sessionResponse.success && sessionResponse.data?.user) {
          setUser(sessionResponse.data.user);
          setOverview(worksResponse.success && worksResponse.data ? worksResponse.data : null);
          setLoading(false);
          return;
        }

        if (!cancelled) window.location.href = "/login";
      } catch {
        if (!cancelled) window.location.href = "/login";
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshOverview() {
    const worksResponse = await apiRequest<DashboardOverview>("/api/works");
    if (worksResponse.success && worksResponse.data) {
      setOverview(worksResponse.data);
      return true;
    }

    if (worksResponse.status === 401) window.location.href = "/login";
    return false;
  }

  function openDeleteDialog(work: DashboardWork) {
    setDeleteTarget({ id: work.id, title: work.title });
    setDeleteConfirmInput("");
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteConfirmInput("");
    setDeleteError("");
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    if (!deleteConfirmed) return;

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
      await refreshOverview();
      return;
    }

    setDeleteError(response.message || "删除失败，请稍后再试。");
    setDeleteBusy(false);
  }

  async function handleLogout() {
    if (logoutBusy) return;

    setLogoutBusy(true);
    const response = await apiRequest<{ redirectTo: string }>("/api/auth/logout", {});

    if (response.success && response.data?.redirectTo) {
      window.location.href = response.data.redirectTo;
      return;
    }

    setLogoutBusy(false);
  }

  function updateUser(nextUser: SessionUser) {
    setUser((current) => ({
      ...(current ?? nextUser),
      ...nextUser,
    }));
  }

  return {
    closeDeleteDialog,
    deleteBusy,
    deleteConfirmInput,
    deleteConfirmed,
    deleteError,
    deleteTarget,
    handleConfirmDelete,
    handleLogout,
    loading,
    logoutBusy,
    openDeleteDialog,
    overview,
    setDeleteConfirmInput,
    updateUser,
    user,
  };
}

export type DashboardClientController = ReturnType<typeof useDashboardClient>;

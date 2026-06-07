"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AdminEmailVerifiedFilter,
  AdminMembershipTierFilter,
  AdminUserDetailResponse,
  AdminUserPatchInput,
  AdminUsersResponse,
  AdminUserRoleFilter,
  AdminUserSort,
  AdminUserStatusFilter,
} from "@/lib/admin/admin-user-types";
import { apiRequest } from "@/lib/client/auth-api";

export type AdminUsersLiteController = ReturnType<typeof useAdminUsersLite>;

export function useAdminUsersLite() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AdminUserRoleFilter>("all");
  const [status, setStatus] = useState<AdminUserStatusFilter>("all");
  const [membershipTier, setMembershipTier] = useState<AdminMembershipTierFilter>("all");
  const [emailVerified, setEmailVerified] = useState<AdminEmailVerifiedFilter>("all");
  const [sort, setSort] = useState<AdminUserSort>("createdAt_desc");
  const [take, setTake] = useState<20 | 50 | 100>(20);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const users = data?.users ?? [];
  const nextCursor = data?.nextCursor ?? null;

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
        emailVerified,
        membershipTier,
        role,
        sort,
        status,
        take: String(take),
      });
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (options.cursor) params.set("cursor", options.cursor);

      const response = await apiRequest<AdminUsersResponse>(
        `/api/admin/users?${params.toString()}`,
      );

      if (requestId !== requestIdRef.current) return;

      setLoading(false);
      setLoadingMore(false);

      if (!response.success || !response.data) {
        setError(response.message || "用户列表加载失败。");
        return;
      }

      setData((current) => {
        if (!options.append || !current) return response.data ?? null;
        if (!response.data) return current;
        return {
          ...response.data,
          users: [...current.users, ...response.data.users],
        };
      });
    },
    [emailVerified, membershipTier, query, role, sort, status, take],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    void load({ append: true, cursor: nextCursor });
  }, [load, loadingMore, nextCursor]);

  const saveUser = useCallback(
    async (userId: string, input: AdminUserPatchInput) => {
      if (saving) return false;
      setSaving(true);
      setError("");
      setNotice("");

      const response = await apiRequest<AdminUserDetailResponse>(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        input,
        { method: "PATCH" },
      );

      setSaving(false);

      if (!response.success || !response.data) {
        setError(response.message || "用户保存失败。");
        return false;
      }

      setNotice(response.message || "用户已更新。");
      await load();
      return true;
    },
    [load, saving],
  );

  return {
    data,
    editingUserId,
    emailVerified,
    error,
    loadMore,
    loading,
    loadingMore,
    membershipTier,
    nextCursor,
    notice,
    query,
    refresh,
    role,
    saveUser,
    saving,
    selectedUserId,
    setEditingUserId,
    setEmailVerified,
    setMembershipTier,
    setQuery,
    setRole,
    setSelectedUserId,
    setSort,
    setStatus,
    setTake,
    sort,
    status,
    take,
    users,
  };
}

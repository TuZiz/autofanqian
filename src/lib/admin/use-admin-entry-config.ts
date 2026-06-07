"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { CreateUiConfig, SessionUser } from "./dashboard-admin-types";
import { useAdminCreateConfigActions } from "./use-admin-create-config-actions";

type ConfigSaveState = "dirty" | "error" | "idle" | "saved" | "saving";

export function useAdminEntryConfig() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaveState, setConfigSaveState] = useState<ConfigSaveState>("idle");
  const [configSaveError, setConfigSaveError] = useState("");
  const [configLastSavedAt, setConfigLastSavedAt] = useState<Date | null>(null);

  const latestConfigRef = useRef<CreateUiConfig | null>(null);
  const lastPersistedConfigRef = useRef("");
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const { handleAddGenre, handleAddOption, handleDeleteGenre, handleDeleteOption } =
    useAdminCreateConfigActions({ config, setConfig });

  const persistConfig = useCallback(
    async (nextConfig: CreateUiConfig, options?: { silent?: boolean }) => {
      const requestSerialized = JSON.stringify(nextConfig);
      setSavingConfig(true);
      setConfigSaveState("saving");
      setConfigSaveError("");

      const res = await apiRequest<{ config: CreateUiConfig }>(
        "/api/admin/create-config",
        { config: nextConfig },
        { method: "PUT" },
      );

      setSavingConfig(false);

      if (!res.success) {
        setConfigSaveState("error");
        setConfigSaveError(res.message || "保存失败");
        if (!options?.silent) window.alert(res.message || "保存失败");
        return false;
      }

      lastPersistedConfigRef.current = requestSerialized;
      setConfigLastSavedAt(new Date());

      const currentSerialized = latestConfigRef.current
        ? JSON.stringify(latestConfigRef.current)
        : requestSerialized;
      setConfigSaveState(currentSerialized === requestSerialized ? "saved" : "dirty");

      if (res.data?.config && currentSerialized === requestSerialized) {
        const savedConfig = res.data.config;
        lastPersistedConfigRef.current = JSON.stringify(savedConfig);
        setConfig(savedConfig);
      }

      return true;
    },
    [],
  );

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!config || !autoSaveReadyRef.current) return;

    const serialized = JSON.stringify(config);
    if (serialized === lastPersistedConfigRef.current) {
      setConfigSaveState((current) => (current === "dirty" ? "saved" : current));
      return;
    }

    setConfigSaveState("dirty");
    setConfigSaveError("");

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void persistConfig(config, { silent: true });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [config, persistConfig]);

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

      const configRes = await apiRequest<{ config: CreateUiConfig }>("/api/admin/create-config");

      if (!cancelled && configRes.success && configRes.data?.config) {
        const loadedConfig = configRes.data.config;
        latestConfigRef.current = loadedConfig;
        lastPersistedConfigRef.current = JSON.stringify(loadedConfig);
        autoSaveReadyRef.current = true;
        setConfig(loadedConfig);
        setConfigSaveState("saved");
        setConfigLastSavedAt(new Date());
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveConfig() {
    if (!config) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await persistConfig(config);
  }

  return {
    config,
    configLastSavedAt,
    configSaveError,
    configSaveState,
    handleAddGenre,
    handleAddOption,
    handleDeleteGenre,
    handleDeleteOption,
    handleSaveConfig,
    loading,
    savingConfig,
    setConfig,
    user,
  };
}

export type AdminEntryConfigController = ReturnType<typeof useAdminEntryConfig>;

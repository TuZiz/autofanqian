"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { PlanningWindowConfig, SessionUser } from "./dashboard-admin-types";

type ConfigSaveState = "dirty" | "error" | "idle" | "saved" | "saving";

export function useAdminRules() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [planningConfig, setPlanningConfig] = useState<PlanningWindowConfig | null>(null);
  const [planningSaveState, setPlanningSaveState] = useState<ConfigSaveState>("idle");
  const [planningSaveError, setPlanningSaveError] = useState("");
  const [planningLastSavedAt, setPlanningLastSavedAt] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState("global");

  const latestPlanningConfigRef = useRef<PlanningWindowConfig | null>(null);
  const lastPersistedPlanningRef = useRef("");
  const planningAutoSaveReadyRef = useRef(false);
  const planningAutoSaveTimerRef = useRef<number | null>(null);

  const persistPlanningConfig = useCallback(async (nextConfig: PlanningWindowConfig) => {
    const requestSerialized = JSON.stringify(nextConfig);
    setPlanningSaveState("saving");
    setPlanningSaveError("");

    const res = await apiRequest<{ config: PlanningWindowConfig }>(
      "/api/admin/planning-config",
      { config: nextConfig },
      { method: "PUT" },
    );

    if (!res.success) {
      setPlanningSaveState("error");
      setPlanningSaveError(res.message || "保存失败");
      return false;
    }

    lastPersistedPlanningRef.current = requestSerialized;
    setPlanningLastSavedAt(new Date());

    const currentSerialized = latestPlanningConfigRef.current
      ? JSON.stringify(latestPlanningConfigRef.current)
      : requestSerialized;
    setPlanningSaveState(currentSerialized === requestSerialized ? "saved" : "dirty");

    if (res.data?.config && currentSerialized === requestSerialized) {
      const savedConfig = res.data.config;
      lastPersistedPlanningRef.current = JSON.stringify(savedConfig);
      setPlanningConfig(savedConfig);
    }

    return true;
  }, []);

  useEffect(() => {
    latestPlanningConfigRef.current = planningConfig;
  }, [planningConfig]);

  useEffect(() => {
    if (!planningConfig || !planningAutoSaveReadyRef.current) return;

    const serialized = JSON.stringify(planningConfig);
    if (serialized === lastPersistedPlanningRef.current) {
      setPlanningSaveState((current) => (current === "dirty" ? "saved" : current));
      return;
    }

    setPlanningSaveState("dirty");
    setPlanningSaveError("");

    if (planningAutoSaveTimerRef.current) window.clearTimeout(planningAutoSaveTimerRef.current);
    planningAutoSaveTimerRef.current = window.setTimeout(() => {
      planningAutoSaveTimerRef.current = null;
      void persistPlanningConfig(planningConfig);
    }, 900);

    return () => {
      if (planningAutoSaveTimerRef.current) {
        window.clearTimeout(planningAutoSaveTimerRef.current);
        planningAutoSaveTimerRef.current = null;
      }
    };
  }, [persistPlanningConfig, planningConfig]);

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

      const planningRes = await apiRequest<{ config: PlanningWindowConfig }>("/api/admin/planning-config");

      if (!cancelled && planningRes.success && planningRes.data?.config) {
        const loadedPlanning = planningRes.data.config;
        latestPlanningConfigRef.current = loadedPlanning;
        lastPersistedPlanningRef.current = JSON.stringify(loadedPlanning);
        planningAutoSaveReadyRef.current = true;
        setPlanningConfig(loadedPlanning);
        setPlanningSaveState("saved");
        setPlanningLastSavedAt(new Date());
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

  function handleUpdatePlanningConfig(nextConfig: PlanningWindowConfig) {
    setPlanningConfig(nextConfig);
  }

  return {
    activeSection,
    handleUpdatePlanningConfig,
    loading,
    planningConfig,
    planningLastSavedAt,
    planningSaveError,
    planningSaveState,
    setActiveSection,
    user,
  };
}

export type AdminRulesController = ReturnType<typeof useAdminRules>;

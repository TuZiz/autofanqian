"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  AiModelConfig,
  AiModelConfigResponse,
  AiModelSessionUser,
  PhysicalProviderOption,
  ProviderOption,
} from "./ai-model-types";
import { getDefaultAiModelConfig } from "./ai-model-utils";

export function useAiModelConfig() {
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [user, setUser] = useState<AiModelSessionUser | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [physicalProviders, setPhysicalProviders] = useState<PhysicalProviderOption[]>([]);
  const [config, setConfig] = useState<AiModelConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await apiRequest<{ user: AiModelSessionUser }>("/api/auth/session");
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

      const res = await apiRequest<AiModelConfigResponse>("/api/admin/ai-model-config");
      if (cancelled) return;

      if (res.success && res.data?.config) {
        setProviders(res.data.providers ?? []);
        setPhysicalProviders(res.data.physicalProviders ?? []);
        setConfig(res.data.config);
      } else {
        setProviders([]);
        setPhysicalProviders([]);
        setConfig(getDefaultAiModelConfig());
        window.alert(res.message || "加载 AI 模型配置失败");
      }

      setBootstrapLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!config || saving) return;

    setSaving(true);
    const res = await apiRequest<{ config: AiModelConfig }>(
      "/api/admin/ai-model-config",
      { config },
      { method: "PUT" },
    );
    setSaving(false);

    if (!res.success || !res.data?.config) {
      window.alert(res.message || "保存失败");
      return;
    }

    setConfig(res.data.config);
    window.alert("已保存，新的 AI 请求会立刻按该配置生效。");
  }

  return {
    bootstrapLoading,
    config,
    handleSave,
    physicalProviders,
    providers,
    saving,
    setConfig,
    user,
  };
}

export type AiModelConfigController = ReturnType<typeof useAiModelConfig>;

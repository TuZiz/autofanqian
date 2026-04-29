"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  AiStats,
  CreateUiConfig,
  OptionConfig,
  OptionSectionKey,
  SessionUser,
  TemplateItem,
} from "./dashboard-admin-types";

type ConfigSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function useDashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaveState, setConfigSaveState] = useState<ConfigSaveState>("idle");
  const [configSaveError, setConfigSaveError] = useState("");
  const [configLastSavedAt, setConfigLastSavedAt] = useState<Date | null>(null);
  const [aiStats, setAiStats] = useState<AiStats | null>(null);
  const [aiStatsLoading, setAiStatsLoading] = useState(false);
  const [genreForTemplates, setGenreForTemplates] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [learning, setLearning] = useState(false);

  const latestConfigRef = useRef<CreateUiConfig | null>(null);
  const lastPersistedConfigRef = useRef("");
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const genreOptions = useMemo(() => config?.genres ?? [], [config]);

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

      const nextUser = session.data.user;
      if (!nextUser.isAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setUser(nextUser);
      setAiStatsLoading(true);
      const [configRes, statsRes] = await Promise.all([
        apiRequest<{ config: CreateUiConfig }>("/api/admin/create-config"),
        apiRequest<AiStats>("/api/admin/ai-stats"),
      ]);

      if (!cancelled && configRes.success && configRes.data?.config) {
        const loadedConfig = configRes.data.config;
        latestConfigRef.current = loadedConfig;
        lastPersistedConfigRef.current = JSON.stringify(loadedConfig);
        autoSaveReadyRef.current = true;
        setConfig(loadedConfig);
        setConfigSaveState("saved");
        setConfigLastSavedAt(new Date());
        setGenreForTemplates(loadedConfig.genres[0]?.id ?? "");
      }

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

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      if (!genreForTemplates) {
        setTemplates([]);
        return;
      }

      setTemplatesLoading(true);
      const res = await apiRequest<{ templates: TemplateItem[] }>(
        `/api/admin/templates?genreId=${encodeURIComponent(genreForTemplates)}`,
      );

      if (cancelled) return;
      setTemplates(res.success && res.data?.templates ? res.data.templates : []);
      setTemplatesLoading(false);
    }

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [genreForTemplates]);

  async function handleRefreshAiStats() {
    setAiStatsLoading(true);
    const res = await apiRequest<AiStats>("/api/admin/ai-stats");
    setAiStatsLoading(false);

    if (!res.success || !res.data) {
      window.alert(res.message || "加载统计失败");
      return;
    }

    setAiStats(res.data);
  }

  async function handleSaveConfig() {
    if (!config) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await persistConfig(config);
  }

  function handleAddGenre() {
    if (!config) return;

    const id =
      window.prompt("请输入新类型 ID（建议英文/数字，如 fantasy2）", "new_genre")?.trim() ??
      "";
    if (!id) return;

    if (config.genres.some((genre) => genre.id === id)) {
      window.alert("该 ID 已存在，请换一个。");
      return;
    }

    const name = window.prompt("请输入类型名称", "新类型")?.trim() ?? "";
    if (!name) return;

    const nextSortOrder = Math.max(0, ...config.genres.map((genre) => genre.sortOrder ?? 0)) + 10;
    setConfig({
      ...config,
      genres: [
        ...config.genres,
        {
          id,
          name,
          tags: [],
          icon: "✍️",
          gradient: "from-emerald-500 to-teal-500",
          sortOrder: nextSortOrder,
          active: true,
        },
      ],
    });
  }

  function handleDeleteGenre(id: string) {
    if (!config) return;
    if (!window.confirm(`确定删除类型「${id}」吗？`)) return;
    setConfig({
      ...config,
      genres: config.genres.filter((genre) => genre.id !== id),
    });
  }

  function handleAddOption(section: OptionSectionKey) {
    if (!config) return;

    const id =
      window.prompt("请输入新选项 ID（建议英文/数字，如 qidian2）", "new_option")?.trim() ??
      "";
    if (!id) return;

    const items = (config[section] ?? []) as OptionConfig[];
    if (items.some((item) => item.id === id)) {
      window.alert("该 ID 已存在，请换一个。");
      return;
    }

    const label = window.prompt("请输入显示名称", "新选项")?.trim() ?? "";
    if (!label) return;

    const nextSortOrder = Math.max(0, ...items.map((item) => item.sortOrder ?? 0)) + 10;
    setConfig({
      ...config,
      [section]: [
        ...items,
        { id, label, promptHint: "", sortOrder: nextSortOrder, active: true },
      ],
    } as CreateUiConfig);
  }

  function handleDeleteOption(section: OptionSectionKey, id: string) {
    if (!config) return;
    if (!window.confirm(`确定删除选项「${id}」吗？`)) return;

    const items = (config[section] ?? []) as OptionConfig[];
    setConfig({
      ...config,
      [section]: items.filter((item) => item.id !== id),
    } as CreateUiConfig);
  }

  async function handleUpdateTemplate(id: string, patch: Partial<TemplateItem>) {
    const res = await apiRequest<{ template: TemplateItem }>(
      `/api/admin/templates/${encodeURIComponent(id)}`,
      {
        title: patch.title ?? undefined,
        content: patch.content ?? undefined,
        isActive: patch.isActive ?? undefined,
      },
      { method: "PUT" },
    );

    if (!res.success) {
      window.alert(res.message || "更新失败");
      return;
    }

    if (res.data?.template) {
      setTemplates((prev) => prev.map((item) => (item.id === id ? res.data!.template : item)));
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!window.confirm("确定要删除这条模板吗？")) return;

    const res = await apiRequest<{ id: string }>(
      `/api/admin/templates/${encodeURIComponent(id)}`,
      {},
      { method: "DELETE" },
    );

    if (!res.success) {
      window.alert(res.message || "删除失败");
      return;
    }

    setTemplates((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleCreateTemplate() {
    if (!genreForTemplates) return;

    const content = window.prompt("请输入新模板内容（建议 100-300 字）");
    if (!content) return;

    const res = await apiRequest<{ template: TemplateItem }>("/api/admin/templates", {
      genreId: genreForTemplates,
      content,
      source: "seed",
      isActive: true,
    });

    if (!res.success || !res.data?.template) {
      window.alert(res.message || "创建失败");
      return;
    }

    setTemplates((prev) => [res.data!.template, ...prev]);
  }

  async function handleLearnTemplates() {
    if (!genreForTemplates) return;

    setLearning(true);
    const res = await apiRequest<{ results: Array<{ genreId: string; created: number }> }>(
      "/api/admin/templates/learn",
      { genreId: genreForTemplates, perGenre: 6 },
    );
    setLearning(false);

    if (!res.success) {
      window.alert(res.message || "学习失败");
      return;
    }

    setTemplatesLoading(true);
    const reload = await apiRequest<{ templates: TemplateItem[] }>(
      `/api/admin/templates?genreId=${encodeURIComponent(genreForTemplates)}`,
    );
    setTemplatesLoading(false);
    if (reload.success && reload.data?.templates) setTemplates(reload.data.templates);

    window.alert("学习完成，已更新热门模板");
  }

  return {
    aiStats,
    aiStatsLoading,
    config,
    configLastSavedAt,
    configSaveError,
    configSaveState,
    genreForTemplates,
    genreOptions,
    handleAddGenre,
    handleAddOption,
    handleCreateTemplate,
    handleDeleteGenre,
    handleDeleteOption,
    handleDeleteTemplate,
    handleLearnTemplates,
    handleRefreshAiStats,
    handleSaveConfig,
    handleUpdateTemplate,
    learning,
    loading,
    savingConfig,
    setConfig,
    setGenreForTemplates,
    setTemplates,
    templates,
    templatesLoading,
    user,
  };
}

export type DashboardAdminController = ReturnType<typeof useDashboardAdmin>;

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { PromptTemplateCategory } from "@/shared/schemas/prompt-template";

export type AdminPromptTemplate = {
  id: string;
  key: string;
  category: PromptTemplateCategory;
  name: string;
  content: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPromptDraft = {
  key: string;
  category: PromptTemplateCategory;
  name: string;
  content: string;
  isActive: boolean;
};

const defaultDraft: AdminPromptDraft = {
  key: "chapter.rewrite",
  category: "chapter",
  name: "",
  content: "",
  isActive: true,
};

export function useAdminPrompts() {
  const [templates, setTemplates] = useState<AdminPromptTemplate[]>([]);
  const [categories, setCategories] = useState<PromptTemplateCategory[]>([]);
  const [category, setCategory] = useState<PromptTemplateCategory | "all">("all");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<AdminPromptDraft>(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const filtered = useMemo(
    () => templates.filter((item) => category === "all" || item.category === category),
    [category, templates],
  );

  const activeByKey = useMemo(() => {
    const map = new Map<string, AdminPromptTemplate>();
    for (const item of templates) {
      if (!item.isActive) continue;
      const current = map.get(item.key);
      if (!current || item.version > current.version) map.set(item.key, item);
    }
    return map;
  }, [templates]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await apiRequest<{
      templates: AdminPromptTemplate[];
      categories: PromptTemplateCategory[];
    }>("/api/admin/prompts");
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.message || "提示词模板加载失败。");
      return;
    }
    const nextData = response.data;
    setTemplates(nextData.templates);
    setCategories(nextData.categories);
    setSelectedId((current) => current || nextData.templates[0]?.id || "");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function selectTemplate(template: AdminPromptTemplate) {
    setSelectedId(template.id);
    setDraft({
      key: template.key,
      category: template.category,
      name: template.name,
      content: template.content,
      isActive: template.isActive,
    });
    setNotice("");
    setError("");
  }

  function startCreate() {
    setSelectedId("");
    setDraft(defaultDraft);
    setNotice("");
    setError("");
  }

  async function save(options?: { createVersion?: boolean }) {
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const response = selected
      ? await apiRequest<{ template: AdminPromptTemplate }>(
          `/api/admin/prompts/${encodeURIComponent(selected.id)}`,
          {
            name: draft.name,
            content: draft.content,
            isActive: draft.isActive,
            createVersion: options?.createVersion ?? false,
          },
          { method: "PUT" },
        )
      : await apiRequest<{ template: AdminPromptTemplate }>(
          "/api/admin/prompts",
          draft,
          { method: "POST" },
        );
    setSaving(false);
    if (!response.success || !response.data?.template) {
      setError(response.message || "提示词模板保存失败。");
      return;
    }
    setNotice(response.message || "提示词模板已保存。");
    setSelectedId(response.data.template.id);
    setDraft({
      key: response.data.template.key,
      category: response.data.template.category,
      name: response.data.template.name,
      content: response.data.template.content,
      isActive: response.data.template.isActive,
    });
    await load();
  }

  async function deactivate(template: AdminPromptTemplate) {
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const response = await apiRequest(
      `/api/admin/prompts/${encodeURIComponent(template.id)}`,
      undefined,
      { method: "DELETE" },
    );
    setSaving(false);
    if (!response.success) {
      setError(response.message || "停用提示词模板失败。");
      return;
    }
    setNotice(response.message || "模板已停用。");
    await load();
  }

  return {
    activeByKey,
    categories,
    category,
    deactivate,
    draft,
    error,
    filtered,
    load,
    loading,
    notice,
    save,
    saving,
    selectTemplate,
    selected,
    selectedId,
    setCategory,
    setDraft,
    setSelectedId,
    startCreate,
    templates,
  };
}

export type AdminPromptsController = ReturnType<typeof useAdminPrompts>;

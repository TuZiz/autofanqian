"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { TemplateItem } from "./dashboard-admin-types";

export function useAdminTemplates() {
  const [genreForTemplates, setGenreForTemplates] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [learning, setLearning] = useState(false);

  const reloadTemplates = useCallback(async (genreId: string) => {
    setTemplatesLoading(true);
    const res = await apiRequest<{ templates: TemplateItem[] }>(
      `/api/admin/templates?genreId=${encodeURIComponent(genreId)}`,
    );
    setTemplatesLoading(false);

    if (res.success && res.data?.templates) {
      setTemplates(res.data.templates);
      return true;
    }

    setTemplates([]);
    return false;
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

  const handleUpdateTemplate = useCallback(
    async (id: string, patch: Partial<TemplateItem>) => {
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
        setTemplates((prev) =>
          prev.map((item) => (item.id === id ? res.data!.template : item)),
        );
      }
    },
    [],
  );

  const handleDeleteTemplate = useCallback(async (id: string) => {
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
  }, []);

  const handleCreateTemplate = useCallback(async () => {
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
  }, [genreForTemplates]);

  const handleLearnTemplates = useCallback(async () => {
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

    await reloadTemplates(genreForTemplates);
    window.alert("学习完成，已更新热门模板");
  }, [genreForTemplates, reloadTemplates]);

  return {
    genreForTemplates,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleLearnTemplates,
    handleUpdateTemplate,
    learning,
    setGenreForTemplates,
    setTemplates,
    templates,
    templatesLoading,
  };
}

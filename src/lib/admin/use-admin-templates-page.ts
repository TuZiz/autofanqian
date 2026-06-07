"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type { CreateUiConfig, SessionUser } from "./dashboard-admin-types";
import { useAdminTemplates } from "./use-admin-templates";

export function useAdminTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [genreOptions, setGenreOptions] = useState<CreateUiConfig["genres"]>([]);
  const [activeSection, setActiveSection] = useState("list");

  const {
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
  } = useAdminTemplates();

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
        setGenreOptions(loadedConfig.genres);
        if (!genreForTemplates && loadedConfig.genres[0]) {
          setGenreForTemplates(loadedConfig.genres[0].id);
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [genreForTemplates, setGenreForTemplates]);

  return {
    activeSection,
    genreForTemplates,
    genreOptions,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleLearnTemplates,
    handleUpdateTemplate,
    learning,
    loading,
    setActiveSection,
    setGenreForTemplates,
    setTemplates,
    templates,
    templatesLoading,
    user,
  };
}

export type AdminTemplatesPageController = ReturnType<typeof useAdminTemplatesPage>;

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchCreateConfig,
  fetchCreateSession,
  fetchCreateTemplates,
} from "@/frontend/api/create-flow";
import {
  EMPTY_GENRES,
  EMPTY_OPTIONS,
  TEMPLATE_SHOWCASE_LIMIT,
  shuffleItems,
  summarizeTemplatePreview,
} from "./dashboard-create-rules";
import type {
  CreateUiConfig,
  GenreId,
  HotTemplate,
  TemplateShowcaseCard,
} from "./dashboard-create-types";
import { CUSTOM_GENRE_ID } from "./dashboard-create-utils";

export function useCreateBootstrapData({
  selectedGenre,
  setDnaBookTitle,
  setSelectedGenre,
  setWords,
}: {
  selectedGenre: GenreId | "";
  setSelectedGenre: (updater: (current: GenreId | "") => GenreId | "") => void;
  setDnaBookTitle: (value: string) => void;
  setWords: (updater: (current: string) => string) => void;
}) {
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [hotTemplates, setHotTemplates] = useState<HotTemplate[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [templateShowcaseBusy, setTemplateShowcaseBusy] = useState(false);
  const [templateShowcaseNonce, setTemplateShowcaseNonce] = useState(0);
  const [templateShowcaseCards, setTemplateShowcaseCards] = useState<TemplateShowcaseCard[]>([]);

  const genres = config?.genres ?? EMPTY_GENRES;
  const platforms = config?.platforms ?? EMPTY_OPTIONS;
  const dnaStyles = config?.dnaStyles ?? EMPTY_OPTIONS;
  const wordOptions = config?.wordOptions ?? EMPTY_OPTIONS;
  const customGenre = useMemo(
    () => genres.find((item) => item.id === CUSTOM_GENRE_ID),
    [genres],
  );
  const visibleGenres = useMemo(
    () => genres.filter((item) => item.id !== CUSTOM_GENRE_ID),
    [genres],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetchCreateSession();

      if (cancelled) return;

      if (response.success && response.data?.user?.email) {
        setUserEmail(response.data.user.email);
        const admin = Boolean(response.data.user.isAdmin);
        setIsAdmin(admin);
        if (!admin) setDnaBookTitle("");
      } else {
        window.location.href = "/login";
        return;
      }

      const configResponse = await fetchCreateConfig();

      if (!cancelled && configResponse.success && configResponse.data?.config) {
        const nextConfig = configResponse.data.config;
        setConfig(nextConfig);
        setSelectedGenre((current) => {
          if (current) return current;
          if (nextConfig.genres.some((item) => item.id === CUSTOM_GENRE_ID)) {
            return CUSTOM_GENRE_ID;
          }
          return nextConfig.genres[0]?.id ?? "";
        });

        setWords((prev) =>
          nextConfig.wordOptions.some((opt) => opt.id === prev) ? prev : "",
        );
      }

      if (!cancelled) setBootstrapLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setDnaBookTitle, setSelectedGenre, setWords]);

  useEffect(() => {
    let cancelled = false;

    async function loadHotTemplates() {
      if (!selectedGenre || selectedGenre === CUSTOM_GENRE_ID) {
        setHotTemplates([]);
        return;
      }

      const response = await fetchCreateTemplates(selectedGenre);

      if (cancelled) return;

      if (response.success && response.data?.templates) {
        setHotTemplates(response.data.templates);
        return;
      }

      setHotTemplates([]);
    }

    void loadHotTemplates();

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplateShowcase() {
      if (!visibleGenres.length) {
        setTemplateShowcaseCards([]);
        setTemplateShowcaseBusy(false);
        return;
      }

      setTemplateShowcaseBusy(true);

      const groups = await Promise.all(
        visibleGenres.map(async (genre) => {
          const response = await fetchCreateTemplates(genre.id);
          const templates = response.success && response.data?.templates ? response.data.templates : [];

          return templates.map((template) => ({
            id: template.id,
            genreId: genre.id,
            genreLabel: genre.name,
            content: template.content,
          }));
        }),
      );

      if (cancelled) {
        return;
      }

      const flattened = shuffleItems(groups.flat())
        .slice(0, TEMPLATE_SHOWCASE_LIMIT)
        .map((template, index) => ({
          ...template,
          label: `模板 ${index + 1}`,
          summary: summarizeTemplatePreview(template.content),
        }));

      setTemplateShowcaseCards(flattened);
      setTemplateShowcaseBusy(false);
    }

    void loadTemplateShowcase();

    return () => {
      cancelled = true;
    };
  }, [templateShowcaseNonce, visibleGenres]);

  function refreshTemplateShowcase() {
    setTemplateShowcaseNonce((current) => current + 1);
  }

  return {
    bootstrapLoading,
    config,
    customGenre,
    dnaStyles,
    genres,
    hotTemplates,
    isAdmin,
    platforms,
    refreshTemplateShowcase,
    templateShowcaseBusy,
    templateShowcaseCards,
    userEmail,
    visibleGenres,
    wordOptions,
  };
}

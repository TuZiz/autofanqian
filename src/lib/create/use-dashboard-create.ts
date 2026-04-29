"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import {
  CREATE_OUTLINE_DRAFT_STORAGE_KEY,
  CREATE_OUTLINE_RESULT_CACHE_KEY,
  type CreateOutlineDraft,
} from "@/lib/create/outline-draft";

import type {
  CreateUiConfig,
  HotTemplate,
  IdeaAnalysis,
  GenreId,
  SessionUser,
} from "./dashboard-create-types";
import { AI_THINKING_COPY, CUSTOM_GENRE_ID, parseTagInput } from "./dashboard-create-utils";

export function useDashboardCreate() {
  const [selectedGenre, setSelectedGenre] = useState<GenreId | "">("");
  const [customGenreLabel, setCustomGenreLabel] = useState("");
  const [customTagsInput, setCustomTagsInput] = useState("");
  const [idea, setIdea] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiThinkingCopyIndex, setAiThinkingCopyIndex] = useState(0);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [platform, setPlatform] = useState("");
  const [dnaBookTitle, setDnaBookTitle] = useState("");
  const [words, setWords] = useState("100w");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<CreateUiConfig | null>(null);
  const [hotTemplates, setHotTemplates] = useState<HotTemplate[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [ideaAnalysis, setIdeaAnalysis] = useState<IdeaAnalysis | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const router = useRouter();
  const aiProgressIntervalRef = useRef<number | null>(null);
  const aiProgressResetRef = useRef<number | null>(null);
  const aiThinkingCopyIntervalRef = useRef<number | null>(null);

  const genres = config?.genres ?? [];
  const platforms = config?.platforms ?? [];
  const dnaStyles = config?.dnaStyles ?? [];
  const wordOptions = config?.wordOptions ?? [];
  const customGenre = genres.find((item) => item.id === CUSTOM_GENRE_ID);
  const visibleGenres = genres.filter((item) => item.id !== CUSTOM_GENRE_ID);
  const isCustomGenre = selectedGenre === CUSTOM_GENRE_ID;
  const customTags = useMemo(() => parseTagInput(customTagsInput), [customTagsInput]);
  const normalizedCustomGenreLabel = customGenreLabel.trim();
  const effectiveGenreLabel = isCustomGenre
    ? normalizedCustomGenreLabel || customGenre?.name || "自定义"
    : genres.find((item) => item.id === selectedGenre)?.name;
  const aiThinkingCopy = AI_THINKING_COPY[aiThinkingCopyIndex] ?? AI_THINKING_COPY[0];
  const trimmedIdea = idea.trim();
  const analysisPanelVisible = analysisOpen && Boolean(selectedGenre) && Boolean(trimmedIdea);
  const canAnalyzeIdea = Boolean(selectedGenre) && trimmedIdea.length >= 10;
  const canGenerateAi = Boolean(selectedGenre) && trimmedIdea.length >= 10;

  const selectedTags = useMemo(() => {
    if (!selectedGenre || !config) return [];
    if (selectedGenre === CUSTOM_GENRE_ID && customTags.length) {
      return customTags;
    }
    return config.genres.find((item) => item.id === selectedGenre)?.tags ?? [];
  }, [config, customTags, selectedGenre]);

  const showAiProgress = aiBusy || aiProgress > 0;
  const aiProgressValue = Math.max(0, Math.min(100, aiProgress));
  const aiProgressPercent = Math.round(aiProgressValue);
  const aiProgressLabelLeft = Math.min(97, Math.max(3, aiProgressValue));
  const analyzeBlockedByAiThinking = showAiProgress;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await apiRequest<{ user: SessionUser }>("/api/auth/session");

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

      const configResponse = await apiRequest<{ config: CreateUiConfig }>("/api/config/create");

      if (!cancelled && configResponse.success && configResponse.data?.config) {
        const nextConfig = configResponse.data.config;
        setConfig(nextConfig);

        const defaultWords = nextConfig.wordOptions[0]?.id;
        if (defaultWords) {
          setWords((prev) =>
            nextConfig.wordOptions.some((opt) => opt.id === prev) ? prev : defaultWords,
          );
        }
      }

      if (!cancelled) setBootstrapLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHotTemplates() {
      if (!selectedGenre) {
        setHotTemplates([]);
        return;
      }

      const response = await apiRequest<{ templates: HotTemplate[] }>(
        `/api/create/templates?genreId=${encodeURIComponent(selectedGenre)}`,
      );

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

  function updateIdea(value: string) {
    const nextValue = value.slice(0, 2000);
    setIdea(nextValue);
    setWordCount(nextValue.length);
  }

  function handleSelectGenre(genreId: GenreId) {
    setSelectedGenre(genreId);
    setIdeaAnalysis(null);
  }

  async function handleAnalyzeIdea(nextIdea: string) {
    if (analyzeBlockedByAiThinking) return;

    const trimmed = nextIdea.trim();
    if (!selectedGenre) return;
    if (trimmed.length < 10) return;

    setAnalysisBusy(true);
    setIdeaAnalysis(null);

    try {
      const response = await apiRequest<{ analysis: IdeaAnalysis }>("/api/ai/idea/analyze", {
        genre: selectedGenre,
        customGenreLabel:
          isCustomGenre && normalizedCustomGenreLabel ? normalizedCustomGenreLabel : undefined,
        idea: trimmed,
        tags: selectedTags,
        platform: platform.trim() ? platform.trim() : undefined,
        dnaBookTitle: isAdmin && dnaBookTitle.trim() ? dnaBookTitle.trim() : undefined,
        words: words.trim() ? words.trim() : undefined,
      });

      if (response.success && response.data?.analysis) {
        setIdeaAnalysis(response.data.analysis);
      }
    } finally {
      setAnalysisBusy(false);
    }
  }

  function clearAiProgressTimers() {
    if (aiProgressIntervalRef.current) {
      window.clearInterval(aiProgressIntervalRef.current);
      aiProgressIntervalRef.current = null;
    }

    if (aiProgressResetRef.current) {
      window.clearTimeout(aiProgressResetRef.current);
      aiProgressResetRef.current = null;
    }
  }

  function clearAiThinkingCopyTimer() {
    if (aiThinkingCopyIntervalRef.current) {
      window.clearInterval(aiThinkingCopyIntervalRef.current);
      aiThinkingCopyIntervalRef.current = null;
    }
  }

  function startAiThinkingCopyLoop() {
    clearAiThinkingCopyTimer();
    setAiThinkingCopyIndex(0);

    aiThinkingCopyIntervalRef.current = window.setInterval(() => {
      setAiThinkingCopyIndex((current) => (current + 1) % AI_THINKING_COPY.length);
    }, 1400);
  }

  function stopAiThinkingCopyLoop() {
    clearAiThinkingCopyTimer();
    setAiThinkingCopyIndex(0);
  }

  function startAiProgress() {
    clearAiProgressTimers();
    startAiThinkingCopyLoop();
    setAiProgress(6);

    aiProgressIntervalRef.current = window.setInterval(() => {
      setAiProgress((current) => {
        const cap = 92;
        if (current >= cap) return current;

        const remaining = cap - current;
        const step = Math.min(1, Math.max(0.12, remaining * 0.04));
        return Math.min(cap, current + step);
      });
    }, 40);
  }

  function finishAiProgress() {
    clearAiProgressTimers();
    stopAiThinkingCopyLoop();
    setAiProgress(100);
    aiProgressResetRef.current = window.setTimeout(() => {
      setAiProgress(0);
    }, 650);
  }

  useEffect(() => {
    return () => {
      clearAiProgressTimers();
      clearAiThinkingCopyTimer();
    };
  }, []);

  async function handleGenerateAi() {
    if (!selectedGenre) {
      window.alert("请先在左侧选择小说类型。");
      return;
    }

    if (trimmedIdea.length < 10) {
      window.alert("请先填写创意描述（至少 10 个字），再让 AI 优化创意。");
      return;
    }

    setAiBusy(true);
    startAiProgress();

    try {
      const response = await fetch("/api/ai/idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          genre: selectedGenre,
          customGenreLabel:
            isCustomGenre && normalizedCustomGenreLabel ? normalizedCustomGenreLabel : undefined,
          tags: selectedTags,
          platform: platform.trim() ? platform.trim() : undefined,
          dnaBookTitle: isAdmin && dnaBookTitle.trim() ? dnaBookTitle.trim() : undefined,
          words: words.trim() ? words.trim() : undefined,
          existingIdea: trimmedIdea,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | { success: true; data: { idea: string }; message?: string }
        | { success: false; message?: string; fieldErrors?: Record<string, string[]> }
        | null;

      if (json?.success && json.data?.idea) {
        updateIdea(json.data.idea);
        setIdeaAnalysis(null);
        setAnalysisOpen(true);
        return;
      }

      window.alert(json?.message ?? "AI 生成失败，请稍后重试。");
    } catch {
      window.alert("网络请求异常，请稍后重试。");
    } finally {
      setAiBusy(false);
      finishAiProgress();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitBusy) return;

    if (!selectedGenre) {
      window.alert("必须选择一个小说类型！");
      return;
    }

    const trimmed = idea.trim();
    if (trimmed.length < 10) {
      window.alert("请先填写创意描述（至少 10 个字），再生成大纲。");
      return;
    }

    setSubmitBusy(true);

    const platformId = platform.trim() ? platform.trim() : undefined;
    const draft: CreateOutlineDraft = {
      genre: selectedGenre,
      genreLabel: effectiveGenreLabel,
      idea: trimmed,
      tags: selectedTags,
      platform: platformId,
      platformLabel: platformId
        ? platforms.find((item) => item.id === platformId)?.label
        : undefined,
      dnaBookTitle: isAdmin && dnaBookTitle.trim() ? dnaBookTitle.trim() : undefined,
      words: words.trim() ? words.trim() : undefined,
    };

    try {
      sessionStorage.setItem(CREATE_OUTLINE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      sessionStorage.removeItem(CREATE_OUTLINE_RESULT_CACHE_KEY);
    } catch {
      setSubmitBusy(false);
      window.alert("浏览器存储不可用，无法进入生成页。请检查隐私模式/存储权限后重试。");
      return;
    }

    router.push("/dashboard/create/outline");

    window.setTimeout(() => {
      if (window.location.pathname !== "/dashboard/create/outline") {
        window.location.assign("/dashboard/create/outline");
      }
    }, 250);
  }

  async function handleTemplateUse(template: HotTemplate) {
    updateIdea(template.content);
    setIdeaAnalysis(null);
    await apiRequest("/api/create/templates/use", {
      templateId: template.id,
    });
  }

  return {
    aiBusy,
    aiProgressLabelLeft,
    aiProgressPercent,
    aiProgressValue,
    aiThinkingCopy,
    aiThinkingCopyIndex,
    analysisBusy,
    analysisOpen,
    analysisPanelVisible,
    analyzeBlockedByAiThinking,
    bootstrapLoading,
    canAnalyzeIdea,
    canGenerateAi,
    config,
    customGenre,
    customGenreLabel,
    customTags,
    customTagsInput,
    dnaBookTitle,
    dnaStyles,
    handleAnalyzeIdea,
    handleGenerateAi,
    handleSelectGenre,
    handleSubmit,
    handleTemplateUse,
    hotTemplates,
    idea,
    ideaAnalysis,
    isAdmin,
    isCustomGenre,
    platform,
    platforms,
    selectedGenre,
    setAnalysisOpen,
    setCustomGenreLabel,
    setCustomTagsInput,
    setDnaBookTitle,
    setIdeaAnalysis,
    setPlatform,
    setWords,
    showAiProgress,
    submitBusy,
    updateIdea,
    userEmail,
    visibleGenres,
    wordCount,
    wordOptions,
    words,
  };
}

export type DashboardCreateController = ReturnType<typeof useDashboardCreate>;

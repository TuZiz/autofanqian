"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { markCreateTemplateUsed } from "@/frontend/api/create-flow";
import {
  MIN_IDEA_LENGTH_FOR_AI,
  MIN_IDEA_LENGTH_FOR_OUTLINE,
} from "./dashboard-create-rules";

import {
  getCreateAvailability,
  getCustomDetails,
  getCustomGenreValidationMessage,
  getEffectiveGenreLabel,
  getEffectiveIdeaForAi,
  getSelectedTags,
  getSubmitBlockedReason,
} from "./dashboard-create-derived";
import type { GenreId, HotTemplate, IdeaAnalysis } from "./dashboard-create-types";
import { CUSTOM_GENRE_ID, parseTagInput } from "./dashboard-create-utils";
import { useCreateAiActions } from "./use-create-ai-actions";
import { useCreateAiProgress } from "./use-create-ai-progress";
import { useCreateBootstrapData } from "./use-create-bootstrap-data";
import { useCreateFormError } from "./use-create-form-error";
import { useCreateSubmit } from "./use-create-submit";

export function useDashboardCreate() {
  const [selectedGenre, setSelectedGenre] = useState<GenreId | "">("");
  const [customGenreLabel, setCustomGenreLabelState] = useState("");
  const [customTagsInput, setCustomTagsInputState] = useState("");
  const [customWorldDetails, setCustomWorldDetailsState] = useState("");
  const [idea, setIdea] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [platform, setPlatform] = useState("");
  const [dnaBookTitle, setDnaBookTitle] = useState("");
  const [words, setWords] = useState("");
  const [selectedTemplateCardId, setSelectedTemplateCardId] = useState<string | null>(null);
  const [ideaAnalysis, setIdeaAnalysis] = useState<IdeaAnalysis | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const router = useRouter();
  const {
    aiProgressLabelLeft,
    aiProgressPercent,
    aiProgressValue,
    aiThinkingCopy,
    aiThinkingCopyIndex,
    finishAiProgress,
    showAiProgress,
    startAiProgress,
  } = useCreateAiProgress(aiBusy);
  const {
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
  } = useCreateBootstrapData({
    selectedGenre,
    setDnaBookTitle,
    setSelectedGenre,
    setWords,
  });
  const {
    clearFormError,
    formError,
    formErrorTarget,
    maybeClearCustomGenreError,
    showFormError,
  } = useCreateFormError({
    customGenreLabel,
    customTagsInput,
    customWorldDetails,
    selectedGenre,
  });
  const isCustomGenre = selectedGenre === CUSTOM_GENRE_ID;
  const customTags = useMemo(() => parseTagInput(customTagsInput), [customTagsInput]);
  const normalizedCustomGenreLabel = customGenreLabel.trim();
  const trimmedCustomWorldDetails = customWorldDetails.trim();
  const trimmedIdea = idea.trim();
  const analysisPanelVisible = analysisOpen && Boolean(selectedGenre) && Boolean(trimmedIdea);

  const customGenreValidationMessage = getCustomGenreValidationMessage({
    customTags,
    isCustomGenre,
    normalizedCustomGenreLabel,
    trimmedCustomWorldDetails,
  });

  const selectedTags = useMemo(
    () => getSelectedTags({ config, customTags, selectedGenre }),
    [config, customTags, selectedGenre],
  );

  const customDetails = getCustomDetails({
    customTags,
    isCustomGenre,
    normalizedCustomGenreLabel,
    trimmedCustomWorldDetails,
  });
  const effectiveIdeaForAi = getEffectiveIdeaForAi({
    customDetails,
    isCustomGenre,
    trimmedIdea,
  });
  const effectiveGenreLabel = getEffectiveGenreLabel({
    customGenre,
    genres,
    isCustomGenre,
    normalizedCustomGenreLabel,
    selectedGenre,
  });
  const {
    canAnalyzeIdea,
    canGenerateAi,
    canSubmitOutline,
    outlineIdeaRemaining,
  } = getCreateAvailability({
    customGenreValidationMessage,
    isCustomGenre,
    platform,
    selectedGenre,
    trimmedIdeaLength: trimmedIdea.length,
    words,
  });
  const submitBlockedReason = getSubmitBlockedReason({
    customGenreValidationMessage,
    platform,
    selectedGenre,
    trimmedIdeaLength: trimmedIdea.length,
    words,
  });

  const analyzeBlockedByAiThinking = showAiProgress;
  const {
    analysisBusy,
    handleAnalyzeIdea: runAnalyzeIdea,
    handleGenerateAi,
    handleRandomTemplateStart: runRandomTemplateStart,
    randomTemplateBusy,
  } = useCreateAiActions({
    clearFormError,
    customGenreValidationMessage,
    dnaBookTitle,
    effectiveIdeaForAi,
    finishAiProgress,
    isAdmin,
    isCustomGenre,
    normalizedCustomGenreLabel,
    platform,
    selectedGenre,
    selectedTags,
    setAiBusy,
    setAnalysisOpen,
    setIdeaAnalysis,
    setSelectedGenre,
    setSelectedTemplateCardId,
    showFormError,
    startAiProgress,
    trimmedIdea,
    updateIdea,
    visibleGenres,
    words,
  });
  const { handleSubmit, submitBusy } = useCreateSubmit({
    customDetails: customDetails ?? "",
    customGenreValidationMessage,
    dnaBookTitle,
    effectiveGenreLabel: effectiveGenreLabel ?? "",
    idea,
    isAdmin,
    platform,
    platforms,
    router,
    selectedGenre,
    selectedTags,
    showFormError,
    words,
  });

  function updateIdea(value: string) {
    const nextValue = value.slice(0, 2000);
    setIdea(nextValue);
    setWordCount(nextValue.length);
    const nextTrimmedLength = nextValue.trim().length;
    if (
      (formErrorTarget === "idea" && nextTrimmedLength >= MIN_IDEA_LENGTH_FOR_OUTLINE) ||
      (formErrorTarget === "ai" && nextTrimmedLength >= MIN_IDEA_LENGTH_FOR_AI)
    ) {
      clearFormError();
    }
  }

  function setCustomGenreLabel(value: string) {
    const nextValue = value.slice(0, 32);
    setCustomGenreLabelState(nextValue);
    setIdeaAnalysis(null);
    maybeClearCustomGenreError({ genreLabel: nextValue });
  }

  function setCustomTagsInput(value: string) {
    const nextValue = value.slice(0, 160);
    setCustomTagsInputState(nextValue);
    setIdeaAnalysis(null);
    maybeClearCustomGenreError({ tagsInput: nextValue });
  }

  function setCustomWorldDetails(value: string) {
    const nextValue = value.slice(0, 360);
    setCustomWorldDetailsState(nextValue);
    setIdeaAnalysis(null);
    maybeClearCustomGenreError({ details: nextValue });
  }

  function handleSelectGenre(genreId: GenreId) {
    setSelectedGenre(genreId);
    setIdeaAnalysis(null);
    if (formErrorTarget === "genre") {
      clearFormError();
    }
  }

  function handleUseCustomStart() {
    const nextGenreId = customGenre?.id ?? CUSTOM_GENRE_ID;
    clearFormError();
    setSelectedTemplateCardId(null);
    setAnalysisOpen(false);
    setIdeaAnalysis(null);
    setCustomWorldDetails("");
    updateIdea("");
    handleSelectGenre(nextGenreId);
  }

  async function handleTemplateShowcaseSelect(cardId: string) {
    const card = templateShowcaseCards.find((item) => item.id === cardId);
    if (!card) {
      return;
    }

    clearFormError();
    setSelectedTemplateCardId(card.id);
    handleSelectGenre(card.genreId);
    setCustomWorldDetails(card.content);
    updateIdea(card.content);
    setAnalysisOpen(true);
    setIdeaAnalysis(null);

    await markCreateTemplateUsed(card.id);
  }

  async function handleAnalyzeIdea(nextIdea: string) {
    await runAnalyzeIdea(nextIdea, analyzeBlockedByAiThinking);
  }

  async function handleRandomTemplateStart() {
    await runRandomTemplateStart(aiBusy);
  }

  async function handleTemplateUse(template: HotTemplate) {
    updateIdea(template.content);
    setIdeaAnalysis(null);
    await markCreateTemplateUsed(template.id);
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
    canSubmitOutline,
    config,
    customDetails,
    customGenre,
    customGenreLabel,
    customGenreValidationMessage,
    customTags,
    customTagsInput,
    customWorldDetails,
    dnaBookTitle,
    dnaStyles,
    effectiveGenreLabel,
    effectiveIdeaForAi,
    formError,
    formErrorTarget,
    handleAnalyzeIdea,
    handleGenerateAi,
    handleRandomTemplateStart,
    handleSelectGenre,
    handleSubmit,
    handleTemplateShowcaseSelect,
    handleTemplateUse,
    handleUseCustomStart,
    hotTemplates,
    idea,
    ideaAnalysis,
    isAdmin,
    isCustomGenre,
    outlineIdeaRemaining,
    platform,
    platforms,
    randomTemplateBusy,
    selectedGenre,
    selectedTemplateCardId,
    selectedTags,
    setAnalysisOpen,
    setCustomGenreLabel,
    setCustomTagsInput,
    setCustomWorldDetails,
    setDnaBookTitle,
    setIdeaAnalysis,
    setPlatform,
    setWords,
    showAiProgress,
    submitBlockedReason,
    submitBusy,
    templateShowcaseBusy,
    templateShowcaseCards,
    refreshTemplateShowcase,
    updateIdea,
    userEmail,
    visibleGenres,
    wordCount,
    words,
    MIN_IDEA_LENGTH_FOR_OUTLINE,
    wordOptions,
  };
}

export type DashboardCreateController = ReturnType<typeof useDashboardCreate>;

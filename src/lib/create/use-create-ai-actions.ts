"use client";

import { useState } from "react";

import {
  analyzeCreateIdea,
  fetchCreateTemplates,
  generateCreateIdea,
  markCreateTemplateUsed,
} from "@/frontend/api/create-flow";
import { aiZhCN } from "@/lib/copy/ai-zh-cn";
import {
  MIN_IDEA_LENGTH_FOR_AI,
  type CreateFormErrorTarget,
} from "./dashboard-create-rules";
import type { Genre, GenreId, IdeaAnalysis } from "./dashboard-create-types";
import { CUSTOM_GENRE_ID } from "./dashboard-create-utils";

type AiActionParams = {
  clearFormError: () => void;
  customGenreValidationMessage: string;
  effectiveIdeaForAi: string;
  finishAiProgress: () => void;
  isAdmin: boolean;
  isCustomGenre: boolean;
  normalizedCustomGenreLabel: string;
  platform: string;
  selectedGenre: GenreId | "";
  selectedTags: string[];
  setAiBusy: (value: boolean) => void;
  setAnalysisOpen: (value: boolean) => void;
  setIdeaAnalysis: (value: IdeaAnalysis | null) => void;
  setSelectedGenre: (value: GenreId) => void;
  setSelectedTemplateCardId: (value: string | null) => void;
  showFormError: (message: string, target: CreateFormErrorTarget) => void;
  startAiProgress: () => void;
  trimmedIdea: string;
  updateIdea: (value: string) => void;
  visibleGenres: Genre[];
  words: string;
  dnaBookTitle: string;
};

function getIdeaPayload(params: Pick<
  AiActionParams,
  | "isAdmin"
  | "isCustomGenre"
  | "normalizedCustomGenreLabel"
  | "platform"
  | "selectedGenre"
  | "selectedTags"
  | "words"
  | "dnaBookTitle"
>) {
  return {
    genre: params.selectedGenre,
    customGenreLabel:
      params.isCustomGenre && params.normalizedCustomGenreLabel
        ? params.normalizedCustomGenreLabel
        : undefined,
    tags: params.selectedTags,
    platform: params.platform.trim() ? params.platform.trim() : undefined,
    dnaBookTitle:
      params.isAdmin && params.dnaBookTitle.trim() ? params.dnaBookTitle.trim() : undefined,
    words: params.words.trim() ? params.words.trim() : undefined,
  };
}

export function useCreateAiActions(params: AiActionParams) {
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [randomTemplateBusy, setRandomTemplateBusy] = useState(false);

  async function handleAnalyzeIdea(nextIdea: string, blockedByAiThinking: boolean) {
    if (blockedByAiThinking) return;

    const trimmed = nextIdea.trim();
    if (!params.selectedGenre) return;
    if (trimmed.length < MIN_IDEA_LENGTH_FOR_AI) return;

    if (params.selectedGenre === CUSTOM_GENRE_ID && params.customGenreValidationMessage) {
      params.showFormError(params.customGenreValidationMessage, "genre");
      return;
    }

    setAnalysisBusy(true);
    params.setIdeaAnalysis(null);

    try {
      const response = await analyzeCreateIdea({
        ...getIdeaPayload(params),
        genre: params.selectedGenre,
        idea: params.effectiveIdeaForAi,
      });

      if (response.success && response.data?.analysis) {
        params.setIdeaAnalysis(response.data.analysis);
      }
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function handleGenerateAi() {
    if (!params.selectedGenre) {
      params.showFormError("请先选择小说类型，再让 AI 优化创意。", "genre");
      return;
    }

    if (params.selectedGenre === CUSTOM_GENRE_ID && params.customGenreValidationMessage) {
      params.showFormError(params.customGenreValidationMessage, "genre");
      return;
    }

    const canGenerateFromBlueprint =
      params.isCustomGenre && !params.customGenreValidationMessage;

    if (!canGenerateFromBlueprint && params.trimmedIdea.length < MIN_IDEA_LENGTH_FOR_AI) {
      params.showFormError(
        `请先填写至少 ${MIN_IDEA_LENGTH_FOR_AI} 个字的创意描述，再让 AI 优化创意。`,
        "idea",
      );
      return;
    }

    params.setAiBusy(true);
    params.startAiProgress();

    try {
      const json = await generateCreateIdea({
        ...getIdeaPayload(params),
        genre: params.selectedGenre,
        existingIdea: params.effectiveIdeaForAi,
      });

      if (json?.success && json.data?.idea) {
        params.updateIdea(json.data.idea);
        params.setIdeaAnalysis(null);
        params.setAnalysisOpen(true);
        params.clearFormError();
        return;
      }

      params.showFormError(json?.message ?? aiZhCN.idea.generateFailed, "ai");
    } catch {
      params.showFormError(aiZhCN.common.networkFailed, "ai");
    } finally {
      params.setAiBusy(false);
      params.finishAiProgress();
    }
  }

  async function handleRandomTemplateStart(aiBusy: boolean) {
    if (randomTemplateBusy || aiBusy) return;

    if (!params.visibleGenres.length) {
      params.showFormError("模板配置还在加载，请稍后再试。", "genre");
      return;
    }

    const nextGenre = params.visibleGenres[Math.floor(Math.random() * params.visibleGenres.length)];
    if (!nextGenre) return;

    setRandomTemplateBusy(true);
    params.setAiBusy(true);
    params.setSelectedGenre(nextGenre.id);
    params.setIdeaAnalysis(null);
    params.setAnalysisOpen(false);
    params.clearFormError();
    params.startAiProgress();

    const seedIdea = `我想写一部${nextGenre.name}小说，核心元素包括${nextGenre.tags.slice(0, 4).join("、")}。请随机生成一个有主角、有冲突、有爽点、适合继续扩展成大纲的原创故事简介。`;

    try {
      let starterIdea = seedIdea;
      let templateId = "";

      const templateResponse = await fetchCreateTemplates(nextGenre.id);

      if (templateResponse.success && templateResponse.data?.templates?.length) {
        const templates = templateResponse.data.templates;
        const template = templates[Math.floor(Math.random() * templates.length)];
        if (template?.content) {
          starterIdea = template.content;
          templateId = template.id;
          params.setSelectedTemplateCardId(template.id);
          void markCreateTemplateUsed(templateId);
        }
      } else {
        params.setSelectedTemplateCardId(null);
      }

      params.updateIdea(starterIdea);

      const json = await generateCreateIdea({
        genre: nextGenre.id,
        tags: nextGenre.tags,
        platform: params.platform.trim() ? params.platform.trim() : undefined,
        dnaBookTitle:
          params.isAdmin && params.dnaBookTitle.trim()
            ? params.dnaBookTitle.trim()
            : undefined,
        words: params.words.trim() ? params.words.trim() : undefined,
        existingIdea: starterIdea,
      });

      if (json?.success && json.data?.idea) {
        params.updateIdea(json.data.idea);
        params.setAnalysisOpen(true);
      }
    } catch {
      params.updateIdea(seedIdea);
    } finally {
      setRandomTemplateBusy(false);
      params.setAiBusy(false);
      params.finishAiProgress();
    }
  }

  return {
    analysisBusy,
    handleAnalyzeIdea,
    handleGenerateAi,
    handleRandomTemplateStart,
    randomTemplateBusy,
  };
}

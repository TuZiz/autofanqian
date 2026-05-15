"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  CREATE_OUTLINE_DRAFT_STORAGE_KEY,
  CREATE_OUTLINE_RESULT_CACHE_KEY,
  type CreateOutlineDraft,
} from "@/lib/create/outline-draft";

import { MIN_IDEA_LENGTH_FOR_OUTLINE } from "./dashboard-create-rules";
import type { GenreId } from "./dashboard-create-types";
import { CUSTOM_GENRE_ID } from "./dashboard-create-utils";

export function useCreateSubmit({
  customDetails,
  customGenreValidationMessage,
  dnaBookTitle,
  effectiveGenreLabel,
  idea,
  isAdmin,
  platform,
  platforms,
  router,
  selectedGenre,
  selectedTags,
  showFormError,
  words,
}: {
  customDetails: string;
  customGenreValidationMessage: string;
  dnaBookTitle: string;
  effectiveGenreLabel: string;
  idea: string;
  isAdmin: boolean;
  platform: string;
  platforms: Array<{ id: string; label: string }>;
  router: AppRouterInstance;
  selectedGenre: GenreId | "";
  selectedTags: string[];
  showFormError: (message: string, target: "genre" | "idea" | "storage") => void;
  words: string;
}) {
  const [submitBusy, setSubmitBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitBusy) return;

    if (!selectedGenre) {
      showFormError("请先选择一个创作方向。", "genre");
      return;
    }

    if (selectedGenre === CUSTOM_GENRE_ID && customGenreValidationMessage) {
      showFormError(customGenreValidationMessage, "genre");
      return;
    }

    const trimmed = idea.trim();
    if (trimmed.length < MIN_IDEA_LENGTH_FOR_OUTLINE) {
      showFormError(
        `请补充至少 ${MIN_IDEA_LENGTH_FOR_OUTLINE} 个字的故事创意，再生成大纲。`,
        "idea",
      );
      return;
    }

    setSubmitBusy(true);

    const platformId = platform.trim() ? platform.trim() : undefined;
    const draft: CreateOutlineDraft = {
      genre: selectedGenre,
      genreLabel: effectiveGenreLabel,
      customDetails,
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
      showFormError(
        "当前浏览器存储不可用，无法进入大纲生成页。请检查隐私模式或存储权限后重试。",
        "storage",
      );
      return;
    }

    router.push("/dashboard/create/outline");

    window.setTimeout(() => {
      if (window.location.pathname !== "/dashboard/create/outline") {
        window.location.assign("/dashboard/create/outline");
      }
    }, 250);
  }

  return {
    handleSubmit,
    submitBusy,
  };
}

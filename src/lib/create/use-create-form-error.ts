"use client";

import { useState } from "react";

import type { CreateFormErrorTarget } from "./dashboard-create-rules";
import { isCustomGenreReady } from "./dashboard-create-derived";
import type { GenreId } from "./dashboard-create-types";
import { CUSTOM_GENRE_ID } from "./dashboard-create-utils";

export function useCreateFormError(params: {
  customGenreLabel: string;
  customTagsInput: string;
  customWorldDetails: string;
  selectedGenre: GenreId | "";
}) {
  const [formError, setFormError] = useState("");
  const [formErrorTarget, setFormErrorTarget] = useState<CreateFormErrorTarget | null>(null);

  function clearFormError() {
    setFormError("");
    setFormErrorTarget(null);
  }

  function maybeClearCustomGenreError(next?: {
    genreLabel?: string;
    tagsInput?: string;
    details?: string;
  }) {
    if (formErrorTarget !== "genre" || params.selectedGenre !== CUSTOM_GENRE_ID) return;

    if (
      isCustomGenreReady({
        genreLabel: next?.genreLabel ?? params.customGenreLabel,
        tagsInput: next?.tagsInput ?? params.customTagsInput,
        details: next?.details ?? params.customWorldDetails,
      })
    ) {
      clearFormError();
    }
  }

  function showFormError(message: string, target: CreateFormErrorTarget) {
    setFormError(message);
    setFormErrorTarget(target);

    window.requestAnimationFrame(() => {
      const targetId =
        target === "genre"
          ? "create-genre-section"
          : target === "idea"
            ? "create-idea-section"
            : target === "options"
              ? "create-options-section"
              : "create-form-error";
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (target === "idea") {
        document.querySelector<HTMLTextAreaElement>("#create-idea-input")?.focus({
          preventScroll: true,
        });
        return;
      }

      if (target === "genre") {
        document.querySelector<HTMLButtonElement>("#create-genre-section button")?.focus({
          preventScroll: true,
        });
        return;
      }

      if (target === "options") {
        document.querySelector<HTMLSelectElement>("#create-platform-select")?.focus({
          preventScroll: true,
        });
        return;
      }

      (element as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  return {
    clearFormError,
    formError,
    formErrorTarget,
    maybeClearCustomGenreError,
    showFormError,
  };
}

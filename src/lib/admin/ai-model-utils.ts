import type { AiModelConfig, ProviderOption } from "./ai-model-types";

export function apiKeyEnvName(providerId: ProviderOption["id"]) {
  return providerId === "primary" ? "AI_API_KEY" : "ARK_API_KEY";
}

export function getDefaultAiModelConfig(): AiModelConfig {
  return {
    version: 1,
    ideaGenerate: { providerId: "ark", model: null },
    ideaAnalyze: { providerId: "primary", model: null },
    outlineGenerate: { providerId: "ark", model: null },
    chapterGenerate: { providerId: "primary", model: null },
    chapterSummary: { providerId: "primary", model: null },
    chapterOutline: { providerId: "primary", model: null },
    chapterDetails: { providerId: "primary", model: null },
    templatesLearn: { providerId: "primary", model: null },
    regenerateAll: { providerId: "primary", model: null },
  };
}

export function normalizeOverride(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

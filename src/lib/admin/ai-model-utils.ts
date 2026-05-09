import type { AiModelConfig, ProviderOption } from "./ai-model-types";

export function apiKeyEnvName(providerId: ProviderOption["id"]) {
  if (providerId === "gpt") return "GPT_PRIMARY_API_KEY / GPT_FALLBACK_API_KEY";
  return "ARK_API_KEY";
}

export function getDefaultAiModelConfig(): AiModelConfig {
  return {
    version: 1,
    ideaGenerate: { providerId: "ark", model: null },
    ideaAnalyze: { providerId: "gpt", model: null },
    outlineGenerate: { providerId: "ark", model: null },
    chapterGenerate: { providerId: "gpt", model: "gpt-5.5" },
    chapterRewrite: { providerId: "ark", model: null },
    chapterSummary: { providerId: "ark", model: null },
    chapterOutline: { providerId: "ark", model: null },
    chapterDetails: { providerId: "ark", model: null },
    templatesLearn: { providerId: "gpt", model: null },
    regenerateAll: { providerId: "ark", model: null },
  };
}

export function normalizeOverride(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

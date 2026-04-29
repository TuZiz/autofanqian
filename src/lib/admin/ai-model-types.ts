export type AiModelSessionUser = {
  id: string;
  email: string;
  isAdmin?: boolean;
};

export const AI_MODEL_PROVIDER_IDS = ["primary", "ark"] as const;
export type AiModelProviderId = (typeof AI_MODEL_PROVIDER_IDS)[number];

export const AI_MODEL_CONFIG_KEYS = [
  "ideaGenerate",
  "ideaAnalyze",
  "outlineGenerate",
  "chapterGenerate",
  "chapterSummary",
  "chapterOutline",
  "chapterDetails",
  "templatesLearn",
  "regenerateAll",
] as const;

export type AiModelConfigKey = (typeof AI_MODEL_CONFIG_KEYS)[number];

export type ProviderOption = {
  id: AiModelProviderId;
  label: string;
  configured: boolean;
  apiKeyEnvKey: string;
  envModelKey: string;
  model: string;
  modelOptions: string[];
  baseUrl: string;
  prefer: "chat" | "responses";
};

export type AiModelTarget = {
  providerId: AiModelProviderId;
  model: string | null;
};

export type AiModelConfig = Record<AiModelConfigKey, AiModelTarget> & {
  version: 1;
};

export type AiModelConfigResponse = {
  config: AiModelConfig;
  providers: ProviderOption[];
};

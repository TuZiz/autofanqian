import type { SessionAccessFields } from "@/lib/auth/session-user-types";

export type AiModelSessionUser = SessionAccessFields & {
  id: string;
  email: string;
};

export const AI_MODEL_PROVIDER_IDS = ["gpt", "ark"] as const;
export type AiModelProviderId = (typeof AI_MODEL_PROVIDER_IDS)[number];
export type AiModelProviderProtocol = "route";

export const AI_PHYSICAL_PROVIDER_IDS = ["gpt_primary", "gpt_fallback", "ark"] as const;
export type AiPhysicalProviderId = (typeof AI_PHYSICAL_PROVIDER_IDS)[number];
export type AiPhysicalProviderProtocol = "chat" | "responses";

export const AI_MODEL_CONFIG_KEYS = [
  "ideaGenerate",
  "ideaAnalyze",
  "outlineGenerate",
  "chapterGenerate",
  "chapterRewrite",
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
  routeChain: string[];
  envSummary: string[];
  model: string;
  modelOptions: string[];
  baseUrl: string;
  prefer: AiModelProviderProtocol;
};

export type PhysicalProviderOption = {
  id: AiPhysicalProviderId;
  label: string;
  configured: boolean;
  apiKeyEnvKey: string;
  envModelKey: string;
  model: string;
  modelOptions: string[];
  baseUrl: string;
  prefer: AiPhysicalProviderProtocol;
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
  physicalProviders: PhysicalProviderOption[];
};

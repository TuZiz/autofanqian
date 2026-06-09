export type ProviderProtocol =
  | "openai_chat"
  | "openai_responses"
  | "anthropic_messages";

export type AiProviderType = "openai_compatible" | "anthropic";

export type AiProviderLineId = "primary" | "backup";

export type AiProviderLineSetting = {
  id: AiProviderLineId;
  enabled: boolean;
  providerType: AiProviderType;
  protocol: ProviderProtocol;
  label: string;
  baseUrl: string;
  model: string;
  modelOptions: string[];
  hasApiKey?: boolean;
  apiKeyPreview?: string;
  apiKeyEncrypted?: string;
  anthropicVersion?: string;
};

export type AiProviderFallbackPolicy = {
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  useBackupOnStatus: number[];
};

export type AiProviderSettings = {
  version: 2;
  primary: AiProviderLineSetting;
  backup: AiProviderLineSetting;
  fallbackPolicy: AiProviderFallbackPolicy;
};

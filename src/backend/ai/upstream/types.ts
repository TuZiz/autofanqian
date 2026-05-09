export type UpstreamChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type UpstreamPhysicalProviderId = "gpt_primary" | "gpt_fallback" | "ark";
export type UpstreamRouteId = "gpt" | "ark";
export type UpstreamProviderId = UpstreamPhysicalProviderId;
export type UpstreamEndpoint = "chat" | "responses";

export type UpstreamReasoningEffort = "low" | "medium" | "high";

export type UpstreamProvider = {
  id: UpstreamPhysicalProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  prefer?: UpstreamEndpoint;
};

export type UpstreamRoute = {
  id: UpstreamRouteId;
  label: string;
  providers: UpstreamProvider[];
};

export type UpstreamTextResult = {
  ok: boolean;
  status: number;
  text?: string;
  upstreamMessage?: string;
  routeId?: UpstreamRouteId;
  providerId?: UpstreamPhysicalProviderId;
  endpoint?: UpstreamEndpoint;
  modelUsed?: string;
  usage?: UpstreamTokenUsage;
  durationMs?: number;
  fallbackCount?: number;
  selectedProviderId?: UpstreamPhysicalProviderId;
  probeDurationMs?: number;
};

export type UpstreamTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type UpstreamTextChunk = {
  routeId: UpstreamRouteId;
  providerId: UpstreamPhysicalProviderId;
  endpoint: UpstreamEndpoint;
  modelUsed: string;
  deltaText?: string;
  done?: boolean;
  usage?: UpstreamTokenUsage;
};

export type UpstreamFallbackEvent = {
  providerId: UpstreamPhysicalProviderId;
  status: number;
  upstreamMessage?: string;
  durationMs?: number;
};

export type UpstreamPhysicalProviderConfig = {
  id: UpstreamPhysicalProviderId;
  label: string;
  configured: boolean;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  modelOptions: string[];
  prefer: UpstreamEndpoint;
  apiKeyEnvKey: string;
  envModelKey: string;
};

export type UpstreamRouteConfig = {
  id: UpstreamRouteId;
  label: string;
  configured: boolean;
  providerIds: UpstreamPhysicalProviderId[];
  routeChain: string[];
  envSummary: string[];
  model: string;
  modelOptions: string[];
  baseUrl: string;
  prefer: "route";
};

import { getRuntimeAiProviderSettings } from "@/lib/config/ai-provider-settings";

import type {
  UpstreamPhysicalProviderConfig,
  UpstreamPhysicalProviderId,
  UpstreamProvider,
  UpstreamRouteConfig,
  UpstreamRouteId,
} from "./types";

export const ROUTE_PROVIDER_IDS: Record<
  UpstreamRouteId,
  UpstreamPhysicalProviderId[]
> = {
  gpt: ["primary", "backup", "gpt_primary", "gpt_fallback"],
  ark: ["primary", "backup", "ark", "gpt_primary", "gpt_fallback"],
};

const ROUTE_LABELS: Record<UpstreamRouteId, string> = {
  gpt: "GPT 路线（后台配置 -> xtokenmirror -> 99dun）",
  ark: "豆包路线（后台配置 -> 豆包 -> GPT 路线）",
};

export function readFirstEnv(keys: string[], fallback = "") {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return fallback;
}

export function normalizeModelName(model: string) {
  const trimmed = model.trim();
  if (trimmed === "gpt5.2") return "gpt-5.2";
  if (trimmed === "gpt5.4") return "gpt-5.4";
  return trimmed;
}

export function getAlternateModelName(model: string) {
  if (model === "gpt5.2") return "gpt-5.2";
  if (model === "gpt-5.2") return "gpt5.2";
  if (model === "gpt5.4") return "gpt-5.4";
  if (model === "gpt-5.4") return "gpt5.4";
  return null;
}

function parseModelOptions(raw: string | undefined, fallbackModel: string) {
  const values = (raw || "")
    .split(/[\n,;|]+/g)
    .map((item) => normalizeModelName(item.trim()))
    .filter(Boolean);
  const merged = [normalizeModelName(fallbackModel), ...values].filter(Boolean);
  return Array.from(new Set(merged));
}

export function normalizeRouteId(
  value: string | null | undefined,
): UpstreamRouteId | undefined {
  if (!value) return undefined;
  if (
    value === "gpt" ||
    value === "primary" ||
    value === "anthropic" ||
    value === "backup" ||
    value === "openai_compatible"
  ) {
    return "gpt";
  }
  if (value === "ark") return "ark";
  if (value === "gpt_primary" || value === "gpt_fallback") return "gpt";
  return undefined;
}

export function normalizePhysicalProviderId(
  value: string | null | undefined,
): UpstreamPhysicalProviderId | undefined {
  if (!value) return undefined;
  if (
    value === "openai_compatible" ||
    value === "primary" ||
    value === "backup" ||
    value === "gpt_primary" ||
    value === "gpt_fallback" ||
    value === "ark" ||
    value === "anthropic"
  ) {
    return value;
  }
  return undefined;
}

export function getPositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getAiRouteLabel(routeId: UpstreamRouteId) {
  return ROUTE_LABELS[routeId];
}

export function getAiPhysicalProviderConfigsFromEnv(): UpstreamPhysicalProviderConfig[] {
  const gptPrimaryModel = normalizeModelName(
    readFirstEnv(["GPT_PRIMARY_MODEL", "AI_MODEL"], "gpt-5.4"),
  );
  const gptFallbackModel = normalizeModelName(
    readFirstEnv(["GPT_FALLBACK_MODEL"], "gpt-5.4"),
  );
  const arkModel = normalizeModelName(
    readFirstEnv(["ARK_MODEL"], "doubao-seed-2-0-pro-260215"),
  );
  const anthropicModel = normalizeModelName(
    readFirstEnv(["ANTHROPIC_MODEL"], "claude-sonnet-4-20250514"),
  );

  return [
    {
      id: "gpt_primary",
      providerType: "openai_compatible",
      protocol: "openai_responses",
      label: readFirstEnv(
        ["GPT_PRIMARY_PROVIDER_LABEL", "AI_PROVIDER_LABEL", "AI_PROVIDER_NAME"],
        "xtokenmirror",
      ),
      configured: Boolean(readFirstEnv(["GPT_PRIMARY_API_KEY", "AI_API_KEY"])),
      apiKey: readFirstEnv(["GPT_PRIMARY_API_KEY", "AI_API_KEY"]) || null,
      apiKeyEnvKey: "GPT_PRIMARY_API_KEY",
      envModelKey: "GPT_PRIMARY_MODEL",
      baseUrl: readFirstEnv(
        ["GPT_PRIMARY_BASE_URL", "AI_BASE_URL"],
        "https://www.xtokenmirror.cn",
      ),
      model: gptPrimaryModel,
      modelOptions: parseModelOptions(
        readFirstEnv(["GPT_PRIMARY_MODEL_OPTIONS", "AI_MODEL_OPTIONS"]),
        gptPrimaryModel,
      ),
      prefer: "responses",
    },
    {
      id: "gpt_fallback",
      providerType: "openai_compatible",
      protocol: "openai_responses",
      label: readFirstEnv(["GPT_FALLBACK_PROVIDER_LABEL"], "99dun"),
      configured: Boolean(readFirstEnv(["GPT_FALLBACK_API_KEY"])),
      apiKey: readFirstEnv(["GPT_FALLBACK_API_KEY"]) || null,
      apiKeyEnvKey: "GPT_FALLBACK_API_KEY",
      envModelKey: "GPT_FALLBACK_MODEL",
      baseUrl: readFirstEnv(["GPT_FALLBACK_BASE_URL"], "https://ae.99dun.cc"),
      model: gptFallbackModel,
      modelOptions: parseModelOptions(
        readFirstEnv(["GPT_FALLBACK_MODEL_OPTIONS"]),
        gptFallbackModel,
      ),
      prefer: "responses",
    },
    {
      id: "ark",
      providerType: "openai_compatible",
      protocol: "openai_responses",
      label: readFirstEnv(["ARK_PROVIDER_LABEL", "ARK_PROVIDER_NAME"], "豆包"),
      configured: Boolean(readFirstEnv(["ARK_API_KEY"])),
      apiKey: readFirstEnv(["ARK_API_KEY"]) || null,
      apiKeyEnvKey: "ARK_API_KEY",
      envModelKey: "ARK_MODEL",
      baseUrl: readFirstEnv(
        ["ARK_BASE_URL"],
        "https://ark.cn-beijing.volces.com/api/v3",
      ),
      model: arkModel,
      modelOptions: parseModelOptions(readFirstEnv(["ARK_MODEL_OPTIONS"]), arkModel),
      prefer: "responses",
    },
    {
      id: "anthropic",
      providerType: "anthropic",
      protocol: "anthropic_messages",
      label: readFirstEnv(["ANTHROPIC_PROVIDER_LABEL"], "Anthropic"),
      configured: Boolean(readFirstEnv(["ANTHROPIC_API_KEY"])),
      apiKey: readFirstEnv(["ANTHROPIC_API_KEY"]) || null,
      apiKeyEnvKey: "ANTHROPIC_API_KEY",
      envModelKey: "ANTHROPIC_MODEL",
      baseUrl: readFirstEnv(["ANTHROPIC_BASE_URL"], "https://api.anthropic.com"),
      model: anthropicModel,
      modelOptions: parseModelOptions(
        readFirstEnv(["ANTHROPIC_MODEL_OPTIONS"]),
        anthropicModel,
      ),
      prefer: "messages",
    },
  ];
}

export function getAiRouteConfigsFromEnv(): UpstreamRouteConfig[] {
  const physicalProviders = getAiPhysicalProviderConfigsFromEnv();
  const byId = new Map(physicalProviders.map((provider) => [provider.id, provider]));

  return (Object.keys(ROUTE_PROVIDER_IDS) as UpstreamRouteId[]).map((routeId) => {
    const providerIds = ROUTE_PROVIDER_IDS[routeId];
    const routeProviders = providerIds
      .map((providerId) => byId.get(providerId))
      .filter((provider): provider is UpstreamPhysicalProviderConfig => Boolean(provider));
    const activeHead = routeProviders.find((provider) => provider.configured) ?? routeProviders[0];

    return {
      id: routeId,
      label: getAiRouteLabel(routeId),
      configured: routeProviders.some((provider) => provider.configured),
      providerIds,
      routeChain: routeProviders.map((provider) => provider.label),
      envSummary: Array.from(new Set(routeProviders.map((provider) => provider.apiKeyEnvKey))),
      model: activeHead?.model ?? "",
      modelOptions: activeHead?.modelOptions ?? [],
      baseUrl: activeHead?.baseUrl ?? "",
      prefer: "route",
    };
  });
}

function getAiProvidersFromEnvOnly() {
  return getAiPhysicalProviderConfigsFromEnv()
    .filter((provider) => provider.configured && provider.apiKey)
    .map<UpstreamProvider>((provider) => ({
      id: provider.id,
      providerType: provider.providerType,
      protocol: provider.protocol,
      label: provider.label,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey as string,
      model: provider.model,
      prefer: provider.prefer,
      ...(provider.id === "anthropic"
        ? { anthropicVersion: readFirstEnv(["ANTHROPIC_VERSION"], "2023-06-01") }
        : {}),
    }));
}

export async function getAiProvidersFromEnv() {
  const envProviders = getAiProvidersFromEnvOnly();
  let settingsProviders: UpstreamProvider[] = [];

  try {
    const settings = await getRuntimeAiProviderSettings();
    settingsProviders = settings.map<UpstreamProvider>((provider) => ({
      id: provider.id,
      providerType:
        provider.providerType === "anthropic" ? "anthropic" : "openai_compatible",
      protocol: provider.protocol,
      label: provider.label,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
      prefer:
        provider.protocol === "anthropic_messages"
          ? "messages"
          : provider.protocol === "openai_responses"
            ? "responses"
            : "chat",
      ...(provider.anthropicVersion
        ? { anthropicVersion: provider.anthropicVersion }
        : {}),
    }));
  } catch (error) {
    console.warn("load ai provider settings failed, fallback to env", error);
  }

  const settingsIds = new Set(settingsProviders.map((provider) => provider.id));
  return [
    ...settingsProviders,
    ...envProviders.filter((provider) => !settingsIds.has(provider.id)),
  ];
}

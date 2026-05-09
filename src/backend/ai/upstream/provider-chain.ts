import {
  ROUTE_PROVIDER_IDS,
  normalizeModelName,
  normalizePhysicalProviderId,
  normalizeRouteId,
} from "./config";
import type {
  UpstreamPhysicalProviderId,
  UpstreamProvider,
  UpstreamRouteId,
} from "./types";

export function getProviderApiKeyEnvName(
  providerId: UpstreamRouteId | UpstreamPhysicalProviderId | string,
) {
  const physicalProviderId = normalizePhysicalProviderId(providerId);
  if (physicalProviderId === "gpt_primary") return "GPT_PRIMARY_API_KEY";
  if (physicalProviderId === "gpt_fallback") return "GPT_FALLBACK_API_KEY";
  if (physicalProviderId === "ark") return "ARK_API_KEY";

  const routeId = normalizeRouteId(providerId);
  if (routeId === "ark") {
    return "ARK_API_KEY / GPT_PRIMARY_API_KEY / GPT_FALLBACK_API_KEY";
  }

  return "GPT_PRIMARY_API_KEY / GPT_FALLBACK_API_KEY";
}

export function buildAiProviderChain(params: {
  providers: UpstreamProvider[];
  preferredProviderId: UpstreamRouteId | UpstreamPhysicalProviderId | string;
  overrideModel?: string | null;
}) {
  const routeId = normalizeRouteId(params.preferredProviderId);
  if (!routeId) {
    return [];
  }

  const providerOrder = ROUTE_PROVIDER_IDS[routeId];
  const availableById = new Map(params.providers.map((provider) => [provider.id, provider]));
  const overrideModel = params.overrideModel?.trim();
  let appliedOverride = false;

  const chain: UpstreamProvider[] = [];
  for (const providerId of providerOrder) {
    const provider = availableById.get(providerId);
    if (!provider) continue;

    if (!appliedOverride && overrideModel) {
      chain.push({ ...provider, model: normalizeModelName(overrideModel) });
      appliedOverride = true;
      continue;
    }

    chain.push(provider);
  }

  return chain;
}

export function buildChapterSmartProviderChain(params: {
  providers: UpstreamProvider[];
  overrideModel?: string | null;
}) {
  const availableById = new Map(params.providers.map((provider) => [provider.id, provider]));
  const preferredModel = normalizeModelName(params.overrideModel?.trim() || "gpt-5.5");
  const chainOrder: UpstreamPhysicalProviderId[] = [
    "gpt_primary",
    "gpt_fallback",
    "ark",
  ];

  return chainOrder
    .map((providerId) => availableById.get(providerId))
    .filter((provider): provider is UpstreamProvider => Boolean(provider))
    .map((provider) => ({
      ...provider,
      model: provider.id === "ark" ? provider.model : preferredModel,
    }));
}

export function sortProvidersByPreference(
  providers: UpstreamProvider[],
  preferredProviderId?: string | null,
) {
  const physicalProviderId = normalizePhysicalProviderId(preferredProviderId);
  if (!physicalProviderId) return providers.slice();

  return providers.slice().sort((a, b) => {
    if (a.id === physicalProviderId) return -1;
    if (b.id === physicalProviderId) return 1;
    return 0;
  });
}

export function inferRouteId(params: {
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  providers: UpstreamProvider[];
}) {
  return (
    params.routeId ??
    normalizeRouteId(params.preferredProviderId) ??
    normalizeRouteId(params.providers[0]?.id) ??
    "gpt"
  );
}

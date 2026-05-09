import { getPositiveIntEnv, normalizeModelName } from "./config";
import type { UpstreamPhysicalProviderId } from "./types";

const PROVIDER_HEALTH_SUCCESS_TTL_MS = getPositiveIntEnv(
  "AI_PROVIDER_HEALTH_SUCCESS_TTL_MS",
  90_000,
);
const PROVIDER_HEALTH_FAILURE_TTL_MS = getPositiveIntEnv(
  "AI_PROVIDER_HEALTH_FAILURE_TTL_MS",
  180_000,
);
const providerHealthCache = new Map<
  string,
  { ok: boolean; expiresAt: number; durationMs?: number }
>();

function getProviderHealthKey(params: {
  providerId: UpstreamPhysicalProviderId;
  model: string;
}) {
  return `${params.providerId}:${normalizeModelName(params.model)}`;
}

export function getCachedProviderHealth(params: {
  providerId: UpstreamPhysicalProviderId;
  model: string;
}) {
  const key = getProviderHealthKey(params);
  const cached = providerHealthCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    providerHealthCache.delete(key);
    return null;
  }

  return cached;
}

export function setCachedProviderHealth(
  params: { providerId: UpstreamPhysicalProviderId; model: string },
  ok: boolean,
  durationMs?: number,
) {
  const key = getProviderHealthKey(params);
  providerHealthCache.set(key, {
    ok,
    durationMs,
    expiresAt:
      Date.now() + (ok ? PROVIDER_HEALTH_SUCCESS_TTL_MS : PROVIDER_HEALTH_FAILURE_TTL_MS),
  });
}

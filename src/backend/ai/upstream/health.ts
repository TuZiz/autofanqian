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
const PROVIDER_CIRCUIT_FAILURES = getPositiveIntEnv(
  "AI_PROVIDER_CIRCUIT_FAILURES",
  3,
);
const PROVIDER_CIRCUIT_COOLDOWN_MS = getPositiveIntEnv(
  "AI_PROVIDER_CIRCUIT_COOLDOWN_MS",
  120_000,
);
const providerHealthCache = new Map<
  string,
  { ok: boolean; expiresAt: number; durationMs?: number }
>();
const providerFailureState = new Map<
  UpstreamPhysicalProviderId,
  { failures: number; openedUntil: number }
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

export function isProviderCircuitOpen(providerId: UpstreamPhysicalProviderId) {
  const state = providerFailureState.get(providerId);
  if (!state) return false;
  if (state.openedUntil > 0 && state.openedUntil <= Date.now()) {
    providerFailureState.delete(providerId);
    return false;
  }
  return state.openedUntil > Date.now();
}

export function recordProviderCircuitResult(
  providerId: UpstreamPhysicalProviderId,
  ok: boolean,
) {
  if (ok) {
    providerFailureState.delete(providerId);
    return;
  }

  const current = providerFailureState.get(providerId) ?? {
    failures: 0,
    openedUntil: 0,
  };
  const failures = current.failures + 1;
  providerFailureState.set(providerId, {
    failures,
    openedUntil:
      failures >= PROVIDER_CIRCUIT_FAILURES
        ? Date.now() + PROVIDER_CIRCUIT_COOLDOWN_MS
        : current.openedUntil,
  });
}

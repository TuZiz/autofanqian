import { getCachedProviderHealth, setCachedProviderHealth } from "./health";
import { inferRouteId, sortProvidersByPreference } from "./provider-chain";
import type {
  UpstreamFallbackEvent,
  UpstreamProvider,
  UpstreamReasoningEffort,
  UpstreamRouteId,
  UpstreamTextResult,
} from "./types";

async function runProviderProbe(params: {
  callAiText: (params: {
    providers: UpstreamProvider[];
    routeId?: UpstreamRouteId;
    preferredProviderId?: string | null;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature: number;
    maxTokens: number;
    attempts?: number;
    reasoningEffort?: UpstreamReasoningEffort | null;
    signal?: AbortSignal;
  }) => Promise<UpstreamTextResult>;
  provider: UpstreamProvider;
  routeId: UpstreamRouteId;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
}) {
  const cached = getCachedProviderHealth({
    providerId: params.provider.id,
    model: params.provider.model,
  });

  if (cached) {
    return {
      ok: cached.ok,
      status: cached.ok ? 200 : 503,
      durationMs: cached.durationMs ?? 0,
      cached: true,
    };
  }

  const startedAt = Date.now();
  const result = await params.callAiText({
    providers: [params.provider],
    routeId: params.routeId,
    preferredProviderId: params.provider.id,
    messages: [
      { role: "system", content: "你是中文助手。只回复一个字符。" },
      { role: "user", content: "只回复：1" },
    ],
    temperature: 0,
    maxTokens: 4,
    attempts: 1,
    reasoningEffort: params.reasoningEffort ?? "low",
    signal: params.signal,
  });
  const durationMs = Math.max(0, Date.now() - startedAt);
  const ok = Boolean(result.ok && result.text?.trim());
  setCachedProviderHealth(
    { providerId: params.provider.id, model: params.provider.model },
    ok,
    durationMs,
  );

  return {
    ok,
    status: result.status,
    durationMs,
    cached: false,
    upstreamMessage: result.upstreamMessage,
  };
}

export async function selectHealthyProviderForChapter(params: {
  callAiText: Parameters<typeof runProviderProbe>[0]["callAiText"];
  providers: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
}) {
  const providers = sortProvidersByPreference(params.providers, params.preferredProviderId);
  const routeId = inferRouteId({
    routeId: params.routeId,
    preferredProviderId: params.preferredProviderId,
    providers,
  });

  const failures: UpstreamFallbackEvent[] = [];

  for (const provider of providers) {
    const probe = await runProviderProbe({
      callAiText: params.callAiText,
      provider,
      routeId,
      reasoningEffort: params.reasoningEffort ?? "low",
      signal: params.signal,
    });

    if (probe.ok) {
      return {
        provider,
        routeId,
        probeDurationMs: probe.durationMs,
        fallbackCount: failures.length,
        failures,
      };
    }

    failures.push({
      providerId: provider.id,
      status: probe.status,
      upstreamMessage: probe.upstreamMessage,
      durationMs: probe.durationMs,
    });
  }

  return {
    provider: null,
    routeId,
    probeDurationMs: undefined,
    fallbackCount: failures.length,
    failures,
  };
}

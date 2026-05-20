import { getAlternateModelName, normalizeModelName } from "./config";
import { isProviderCircuitOpen, recordProviderCircuitResult } from "./health";
import { createUpstreamRequestId, logUpstreamRequest } from "./observability";
import { inferRouteId, sortProvidersByPreference } from "./provider-chain";
import { selectHealthyProviderForChapter as selectHealthyProviderForChapterWithProbe } from "./provider-probe";
import {
  callUpstreamWithRetry,
  getEndpointOrder,
  getReasoningCacheKey,
  getUpstreamMessage,
  isReasoningEffortRejected,
  isRetryableStatus,
  shouldRetryWithAlternateModel,
  shouldTryNextEndpoint,
} from "./request";
import { extractTextFromPayload, getTokenUsage } from "./response-parser";
import { callUpstreamStream } from "./stream-request";
import type {
  UpstreamChatMessage,
  UpstreamProvider,
  UpstreamReasoningEffort,
  UpstreamRouteId,
  UpstreamTextChunk,
  UpstreamTextResult,
} from "./types";

const DEFAULT_REASONING_EFFORT: UpstreamReasoningEffort = "medium";
const reasoningEffortUnsupported = new Set<string>();

export async function selectHealthyProviderForChapter(params: {
  providers: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  preferredProviderId?: string | null;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
}) {
  return selectHealthyProviderForChapterWithProbe({
    ...params,
    callAiText,
  });
}

export async function callAiText(params: {
  providers: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
  attempts?: number;
  preferredProviderId?: string | null;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
}): Promise<UpstreamTextResult> {
  const startedAt = Date.now();
  const getDurationMs = () => Math.max(0, Date.now() - startedAt);
  const requestId = createUpstreamRequestId();

  const reasoningEffort =
    params.reasoningEffort === undefined ? DEFAULT_REASONING_EFFORT : params.reasoningEffort;
  const providers = sortProvidersByPreference(params.providers, params.preferredProviderId);
  const routeId = inferRouteId({
    routeId: params.routeId,
    preferredProviderId: params.preferredProviderId,
    providers,
  });

  let lastError: UpstreamTextResult = {
    ok: false,
    status: 502,
    routeId,
  };

  for (const provider of providers) {
    if (isProviderCircuitOpen(provider.id)) {
      lastError = {
        ok: false,
        status: 503,
        upstreamMessage: "provider_circuit_open",
        routeId,
        providerId: provider.id,
        durationMs: getDurationMs(),
      };
      continue;
    }

    const model = normalizeModelName(provider.model);
    const endpoints = getEndpointOrder(provider.prefer);
    let shouldFallbackToNextProvider = false;

    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
      const endpoint = endpoints[endpointIndex];
      let modelUsed = model;

      const callWithReasoningFallback = async (modelName: string) => {
        const cacheKey = getReasoningCacheKey({
          providerId: provider.id,
          endpoint,
          model: modelName,
        });

        const preferredReasoningEffort = reasoningEffortUnsupported.has(cacheKey)
          ? null
          : reasoningEffort;

        let attempt = await callUpstreamWithRetry({
          provider,
          endpoint,
          model: modelName,
          messages: params.messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          attempts: params.attempts,
          reasoningEffort: preferredReasoningEffort,
          signal: params.signal,
        });

        if (!attempt.ok && preferredReasoningEffort) {
          const upstreamMessage = getUpstreamMessage(attempt.json);
          if (isReasoningEffortRejected(attempt.status, upstreamMessage)) {
            reasoningEffortUnsupported.add(cacheKey);
            attempt = await callUpstreamWithRetry({
              provider,
              endpoint,
              model: modelName,
              messages: params.messages,
              temperature: params.temperature,
              maxTokens: params.maxTokens,
              attempts: params.attempts,
              reasoningEffort: null,
              signal: params.signal,
            });
          }
        }

        return attempt;
      };

      let attempt = await callWithReasoningFallback(modelUsed);

      if (!attempt.ok) {
        const upstreamMessage = getUpstreamMessage(attempt.json);
        const alternateModel = getAlternateModelName(modelUsed);

        if (alternateModel && shouldRetryWithAlternateModel(attempt.status, upstreamMessage)) {
          const retry = await callWithReasoningFallback(alternateModel);
          if (retry.ok) {
            attempt = retry;
            modelUsed = alternateModel;
          }
        }
      }

      const upstreamMessage = getUpstreamMessage(attempt.json) ?? undefined;
      const text = extractTextFromPayload(endpoint, attempt.json);

      if (attempt.ok && text) {
        recordProviderCircuitResult(provider.id, true);
        logUpstreamRequest({
          requestId,
          routeId,
          providerId: provider.id,
          endpoint,
          modelUsed,
          durationMs: getDurationMs(),
          status: "success",
          httpStatus: attempt.status,
        });
        return {
          ok: true,
          status: attempt.status,
          text,
          upstreamMessage,
          routeId,
          providerId: provider.id,
          endpoint,
          modelUsed,
          usage: getTokenUsage(attempt.json),
          durationMs: getDurationMs(),
        };
      }

      lastError = {
        ok: false,
        status: attempt.status,
        upstreamMessage,
        routeId,
        providerId: provider.id,
        endpoint,
        modelUsed,
      };
      recordProviderCircuitResult(provider.id, false);
      logUpstreamRequest({
        requestId,
        routeId,
        providerId: provider.id,
        endpoint,
        modelUsed,
        durationMs: getDurationMs(),
        status: attempt.status === 408 ? "timeout" : "fallback",
        httpStatus: attempt.status,
      });

      const tryNextEndpoint =
        endpointIndex < endpoints.length - 1 &&
        shouldTryNextEndpoint(attempt.status, Boolean(text));

      if (tryNextEndpoint) {
        continue;
      }

      shouldFallbackToNextProvider = isRetryableStatus(attempt.status) || (attempt.ok && !text);
      break;
    }

    if (!shouldFallbackToNextProvider) {
      return { ...lastError, durationMs: getDurationMs() };
    }
  }

  return { ...lastError, durationMs: getDurationMs() };
}

export async function streamAiText(params: {
  providers: UpstreamProvider[];
  routeId?: UpstreamRouteId;
  messages: UpstreamChatMessage[];
  temperature: number;
  maxTokens: number;
  attempts?: number;
  preferredProviderId?: string | null;
  reasoningEffort?: UpstreamReasoningEffort | null;
  signal?: AbortSignal;
  onChunk?: (chunk: UpstreamTextChunk) => Promise<void> | void;
}): Promise<UpstreamTextResult> {
  const startedAt = Date.now();
  const getDurationMs = () => Math.max(0, Date.now() - startedAt);
  const requestId = createUpstreamRequestId();
  const reasoningEffort =
    params.reasoningEffort === undefined ? DEFAULT_REASONING_EFFORT : params.reasoningEffort;

  const providers = sortProvidersByPreference(params.providers, params.preferredProviderId);
  const routeId = inferRouteId({
    routeId: params.routeId,
    preferredProviderId: params.preferredProviderId,
    providers,
  });

  let lastError: UpstreamTextResult = {
    ok: false,
    status: 502,
    routeId,
  };

  for (const provider of providers) {
    if (isProviderCircuitOpen(provider.id)) {
      lastError = {
        ok: false,
        status: 503,
        upstreamMessage: "provider_circuit_open",
        routeId,
        providerId: provider.id,
        durationMs: getDurationMs(),
      };
      continue;
    }

    const model = normalizeModelName(provider.model);
    const endpoints = getEndpointOrder(provider.prefer);
    let shouldFallbackToNextProvider = false;

    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
      const endpoint = endpoints[endpointIndex];
      let modelUsed = model;

      const streamWithReasoningFallback = async (modelName: string) => {
        const cacheKey = getReasoningCacheKey({
          providerId: provider.id,
          endpoint,
          model: modelName,
        });
        const preferredReasoningEffort = reasoningEffortUnsupported.has(cacheKey)
          ? null
          : reasoningEffort;

        let streamed = await callUpstreamStream({
          provider,
          routeId,
          endpoint,
          model: modelName,
          messages: params.messages,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          reasoningEffort: preferredReasoningEffort,
          signal: params.signal,
          onChunk: params.onChunk,
        });

        if (!streamed.ok && preferredReasoningEffort && !streamed.started) {
          const upstreamMessage = getUpstreamMessage(streamed.json);
          if (isReasoningEffortRejected(streamed.status, upstreamMessage)) {
            reasoningEffortUnsupported.add(cacheKey);
            streamed = await callUpstreamStream({
              provider,
              routeId,
              endpoint,
              model: modelName,
              messages: params.messages,
              temperature: params.temperature,
              maxTokens: params.maxTokens,
              reasoningEffort: null,
              signal: params.signal,
              onChunk: params.onChunk,
            });
          }
        }

        return streamed;
      };

      let streamed = await streamWithReasoningFallback(modelUsed);

      if (!streamed.ok && !streamed.started) {
        const upstreamMessage = getUpstreamMessage(streamed.json);
        const alternateModel = getAlternateModelName(modelUsed);

        if (alternateModel && shouldRetryWithAlternateModel(streamed.status, upstreamMessage)) {
          const retry = await streamWithReasoningFallback(alternateModel);
          if (retry.ok || retry.started) {
            streamed = retry;
            modelUsed = alternateModel;
          }
        }
      }

      const upstreamMessage = getUpstreamMessage(streamed.json) ?? undefined;
      if (streamed.ok && streamed.text) {
        recordProviderCircuitResult(provider.id, true);
        logUpstreamRequest({
          requestId,
          routeId,
          providerId: provider.id,
          endpoint,
          modelUsed,
          durationMs: getDurationMs(),
          status: "success",
          httpStatus: streamed.status,
        });
        return {
          ok: true,
          status: streamed.status,
          text: streamed.text,
          upstreamMessage,
          routeId,
          providerId: provider.id,
          endpoint,
          modelUsed,
          usage: getTokenUsage(streamed.json),
          durationMs: getDurationMs(),
        };
      }

      lastError = {
        ok: false,
        status: streamed.status,
        upstreamMessage,
        routeId,
        providerId: provider.id,
        endpoint,
        modelUsed,
        durationMs: getDurationMs(),
      };
      recordProviderCircuitResult(provider.id, false);
      logUpstreamRequest({
        requestId,
        routeId,
        providerId: provider.id,
        endpoint,
        modelUsed,
        durationMs: getDurationMs(),
        status:
          streamed.status === 499
            ? "cancelled"
            : streamed.status === 408
              ? "timeout"
              : "fallback",
        httpStatus: streamed.status,
      });

      if (streamed.status === 499 || streamed.started || Boolean(streamed.text?.trim())) {
        return lastError;
      }

      const tryNextEndpoint =
        endpointIndex < endpoints.length - 1 &&
        shouldTryNextEndpoint(streamed.status, Boolean(streamed.text));

      if (tryNextEndpoint) {
        continue;
      }

      shouldFallbackToNextProvider = isRetryableStatus(streamed.status);
      break;
    }

    if (!shouldFallbackToNextProvider) {
      return { ...lastError, durationMs: getDurationMs() };
    }
  }

  return { ...lastError, durationMs: getDurationMs() };
}

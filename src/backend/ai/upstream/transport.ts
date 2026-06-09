import { getPositiveIntEnv } from "./config";
import type { UpstreamEndpoint, UpstreamPhysicalProviderId } from "./types";

const DEFAULT_AI_REQUEST_TIMEOUT_MS = getPositiveIntEnv("AI_REQUEST_TIMEOUT_MS", 240_000);
const DEFAULT_AI_STREAM_IDLE_TIMEOUT_MS = getPositiveIntEnv(
  "AI_STREAM_IDLE_TIMEOUT_MS",
  300_000,
);
const FAST_FAIL_PROVIDER_TIMEOUT_MS = getPositiveIntEnv("AI_FAST_FAIL_TIMEOUT_MS", 45_000);

function isApiVersionBase(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) return true;
  return /\/api\/v\d+$/i.test(trimmed);
}

export function buildEndpointUrl(baseUrl: string, endpoint: UpstreamEndpoint) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const path = endpoint === "chat" ? "/chat/completions" : "/responses";

  if (endpoint === "chat" && /\/chat\/completions$/i.test(trimmed)) {
    return trimmed;
  }

  if (endpoint === "responses" && /\/responses$/i.test(trimmed)) {
    return trimmed;
  }

  if (isApiVersionBase(trimmed)) {
    return `${trimmed}${path}`;
  }

  return `${trimmed}/v1${path}`;
}

export function createManagedAbortSignal(params: {
  externalSignal?: AbortSignal;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const clearTimer = () => {
    if (!timeoutHandle) return;
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  };

  const schedule = (timeoutMs = params.timeoutMs) => {
    clearTimer();
    timedOut = false;
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error("timeout"));
    }, timeoutMs);
  };

  const abortFromExternal = () => {
    clearTimer();
    controller.abort(params.externalSignal?.reason);
  };

  if (params.externalSignal?.aborted) {
    controller.abort(params.externalSignal.reason);
  } else if (params.externalSignal) {
    params.externalSignal.addEventListener("abort", abortFromExternal, { once: true });
  }

  schedule();

  return {
    signal: controller.signal,
    refresh: schedule,
    didTimeout() {
      return timedOut;
    },
    dispose() {
      clearTimer();
      if (params.externalSignal) {
        params.externalSignal.removeEventListener("abort", abortFromExternal);
      }
    },
  };
}

export function getUpstreamTimeoutMs(params: {
  providerId: UpstreamPhysicalProviderId;
  endpoint: UpstreamEndpoint;
  streaming: boolean;
}) {
  if (
    params.providerId === "openai_compatible" ||
    params.providerId === "gpt_primary" ||
    params.providerId === "gpt_fallback"
  ) {
    return FAST_FAIL_PROVIDER_TIMEOUT_MS;
  }

  if (params.endpoint === "responses" || params.endpoint === "messages") {
    return FAST_FAIL_PROVIDER_TIMEOUT_MS;
  }

  return params.streaming ? DEFAULT_AI_STREAM_IDLE_TIMEOUT_MS : DEFAULT_AI_REQUEST_TIMEOUT_MS;
}

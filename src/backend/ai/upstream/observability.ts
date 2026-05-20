import { randomUUID } from "node:crypto";

import type {
  UpstreamEndpoint,
  UpstreamPhysicalProviderId,
  UpstreamRouteId,
} from "./types";

export type UpstreamLogStatus = "success" | "failed" | "fallback" | "timeout" | "cancelled";

export function createUpstreamRequestId() {
  return randomUUID();
}

export function logUpstreamRequest(params: {
  requestId: string;
  routeId: UpstreamRouteId;
  providerId: UpstreamPhysicalProviderId;
  endpoint: UpstreamEndpoint;
  modelUsed: string;
  durationMs: number;
  status: UpstreamLogStatus;
  httpStatus?: number;
}) {
  const payload = {
    requestId: params.requestId,
    routeId: params.routeId,
    providerId: params.providerId,
    endpoint: params.endpoint,
    modelUsed: params.modelUsed,
    durationMs: Math.max(0, Math.round(params.durationMs)),
    status: params.status,
    httpStatus: params.httpStatus,
  };

  if (params.status === "success") {
    console.info("ai.upstream", payload);
  } else {
    console.warn("ai.upstream", payload);
  }
}

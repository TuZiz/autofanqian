import type { SerializedGenerationJobProgress } from "@/shared/schemas/generation-job";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseGenerationJobProgress(resultJson: unknown): SerializedGenerationJobProgress | null {
  const json = asRecord(resultJson);
  if (!json) return null;
  const segments = Array.isArray(json.segments) ? json.segments : [];
  const outline = asRecord(json.outline);
  const beats = Array.isArray(outline?.beats) ? outline.beats : null;
  const finalWorkId = typeof json.finalWorkId === "string" ? json.finalWorkId : null;

  if (!segments.length && !beats?.length && !finalWorkId) return null;
  return {
    generatedSegments: segments.length,
    totalSegments: beats?.length ?? null,
    finalWorkId,
  };
}

export function getGenerationJobFailureCount(resultJson: unknown) {
  const json = asRecord(resultJson);
  const value = json?.failureCount;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function withGenerationJobFailureCount(resultJson: unknown, failureCount: number) {
  const json = asRecord(resultJson);
  return {
    ...(json ?? {}),
    failureCount: Math.max(0, Math.floor(failureCount)),
  };
}

export function shouldAutoRunGenerationJob(resultJson: unknown, maxFailureCount: number) {
  return getGenerationJobFailureCount(resultJson) < maxFailureCount;
}

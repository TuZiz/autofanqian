import "server-only";

export function getUniqueConstraintTargets(error: unknown) {
  if (
    !error ||
    typeof error !== "object" ||
    !("meta" in error) ||
    !(error as { meta?: unknown }).meta
  ) {
    return [];
  }

  const meta = (error as { meta?: unknown }).meta as Record<string, unknown>;
  const target = meta.target;

  if (Array.isArray(target)) {
    return target.map((value) => String(value));
  }

  if (typeof target === "string") {
    return [target];
  }

  return [];
}

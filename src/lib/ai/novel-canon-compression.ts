import type { NovelCanonState } from "@/lib/ai/novel-canon-state";

const LONG_TRIGGER_LIMITS = {
  volumeSummaries: 80,
  characterStates: 120,
  worldRules: 100,
  openForeshadowings: 60,
} as const;

const SHORT_TRIGGER_LIMITS = {
  beatsProgress: 20,
  mustResolveBeforeEnd: 8,
} as const;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeRecent(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result.slice(0, limit);
}

function getCharacterName(item: string) {
  const normalized = normalizeText(item);
  const match = normalized.match(/^([^：:（(，,；;\s]{1,24})/);
  return match?.[1] || normalized.slice(0, 24);
}

function compressCharacterStates(items: string[]) {
  const buckets = new Map<string, string[]>();
  for (const item of dedupeRecent(items, 240)) {
    const name = getCharacterName(item);
    buckets.set(name, [...(buckets.get(name) ?? []), item].slice(0, 3));
  }
  return Array.from(buckets.values()).flat().slice(0, 120);
}

function shouldCompressLong(state: NovelCanonState) {
  return (
    state.long.volumeSummaries.length > LONG_TRIGGER_LIMITS.volumeSummaries ||
    state.long.characterStates.length > LONG_TRIGGER_LIMITS.characterStates ||
    state.long.worldRules.length > LONG_TRIGGER_LIMITS.worldRules ||
    state.long.openForeshadowings.length > LONG_TRIGGER_LIMITS.openForeshadowings
  );
}

function shouldCompressShort(state: NovelCanonState) {
  return (
    state.short.beatsProgress.length > SHORT_TRIGGER_LIMITS.beatsProgress ||
    state.short.mustResolveBeforeEnd.length > SHORT_TRIGGER_LIMITS.mustResolveBeforeEnd
  );
}

export function compressNovelCanonState(state: NovelCanonState): NovelCanonState {
  const next: NovelCanonState = {
    ...state,
    long: { ...state.long },
    short: { ...state.short },
  };

  if (shouldCompressLong(next)) {
    const recentVolumes = dedupeRecent(next.long.volumeSummaries, 40);
    next.long.volumeSummaries = recentVolumes;
    if (recentVolumes.length) {
      next.long.currentVolume = recentVolumes.slice(0, 5).join("；").slice(0, 600);
    }
    next.long.characterStates = compressCharacterStates(next.long.characterStates);
    next.long.worldRules = dedupeRecent(next.long.worldRules, 80);
    next.long.openForeshadowings = dedupeRecent(next.long.openForeshadowings, 50);
    next.long.resolvedForeshadowings = dedupeRecent(next.long.resolvedForeshadowings, 80);
  }

  if (shouldCompressShort(next)) {
    next.short.beatsProgress = dedupeRecent(next.short.beatsProgress, 10);
    next.short.mustResolveBeforeEnd = dedupeRecent(next.short.mustResolveBeforeEnd, 8);
    next.short.forbiddenNewThreads = dedupeRecent(next.short.forbiddenNewThreads, 8);
  }

  return next;
}

export type NovelMode = "long" | "short";

export type NovelCanonState = {
  mode: NovelMode;
  long: {
    mainPlot: string;
    currentVolume: string;
    volumeSummaries: string[];
    characterStates: string[];
    relationships: string[];
    worldRules: string[];
    openForeshadowings: string[];
    resolvedForeshadowings: string[];
    forbiddenContradictions: string[];
  };
  short: {
    theme: string;
    coreConflict: string;
    emotionalArc: string;
    beatsProgress: string[];
    mustResolveBeforeEnd: string[];
    forbiddenNewThreads: string[];
  };
  updatedAtChapter: number;
};

export const CANON_STATE_LIMITS = {
  longCharacterStates: 200,
  longWorldRules: 150,
  longOpenForeshadowings: 100,
  shortBeatsProgress: 30,
  shortMustResolveBeforeEnd: 10,
  shortForbiddenNewThreads: 10,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (isRecord(item)) {
        return Object.values(item)
          .filter((part): part is string => typeof part === "string")
          .join("：")
          .trim();
      }
      return "";
    })
    .filter(Boolean);
}

function dedupeLimited(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized.slice(0, 420));
  }

  return result.slice(0, limit);
}

function mergeLimited(existing: string[], additions: string[], limit: number) {
  return dedupeLimited([...additions, ...existing], limit);
}

function emptyCanonState(mode: NovelMode): NovelCanonState {
  return {
    mode,
    long: {
      mainPlot: "",
      currentVolume: "",
      volumeSummaries: [],
      characterStates: [],
      relationships: [],
      worldRules: [],
      openForeshadowings: [],
      resolvedForeshadowings: [],
      forbiddenContradictions: [],
    },
    short: {
      theme: "",
      coreConflict: "",
      emotionalArc: "",
      beatsProgress: [],
      mustResolveBeforeEnd: [],
      forbiddenNewThreads: [],
    },
    updatedAtChapter: 0,
  };
}

export function normalizeNovelCanonState(
  value: unknown,
  mode: NovelMode,
): NovelCanonState {
  const base = emptyCanonState(mode);
  if (!isRecord(value)) return base;

  const long = isRecord(value.long) ? value.long : {};
  const short = isRecord(value.short) ? value.short : {};
  const normalizedMode = value.mode === "short" || value.mode === "long" ? value.mode : mode;

  return {
    mode: normalizedMode,
    long: {
      mainPlot: readString(long.mainPlot),
      currentVolume: readString(long.currentVolume),
      volumeSummaries: dedupeLimited(readStringArray(long.volumeSummaries), 120),
      characterStates: dedupeLimited(
        readStringArray(long.characterStates),
        CANON_STATE_LIMITS.longCharacterStates,
      ),
      relationships: dedupeLimited(readStringArray(long.relationships), 160),
      worldRules: dedupeLimited(
        readStringArray(long.worldRules),
        CANON_STATE_LIMITS.longWorldRules,
      ),
      openForeshadowings: dedupeLimited(
        readStringArray(long.openForeshadowings),
        CANON_STATE_LIMITS.longOpenForeshadowings,
      ),
      resolvedForeshadowings: dedupeLimited(
        readStringArray(long.resolvedForeshadowings),
        160,
      ),
      forbiddenContradictions: dedupeLimited(
        readStringArray(long.forbiddenContradictions),
        120,
      ),
    },
    short: {
      theme: readString(short.theme),
      coreConflict: readString(short.coreConflict),
      emotionalArc: readString(short.emotionalArc),
      beatsProgress: dedupeLimited(
        readStringArray(short.beatsProgress),
        CANON_STATE_LIMITS.shortBeatsProgress,
      ),
      mustResolveBeforeEnd: dedupeLimited(
        readStringArray(short.mustResolveBeforeEnd),
        CANON_STATE_LIMITS.shortMustResolveBeforeEnd,
      ),
      forbiddenNewThreads: dedupeLimited(
        readStringArray(short.forbiddenNewThreads),
        CANON_STATE_LIMITS.shortForbiddenNewThreads,
      ),
    },
    updatedAtChapter:
      typeof value.updatedAtChapter === "number" && Number.isFinite(value.updatedAtChapter)
        ? Math.max(0, Math.floor(value.updatedAtChapter))
        : 0,
  };
}

function readPlanArray(plan: unknown, key: string) {
  if (!isRecord(plan)) return [];
  return readStringArray(plan[key]);
}

function readPlanText(plan: unknown, key: string) {
  if (!isRecord(plan)) return "";
  return readString(plan[key]);
}

function summarizeContent(content: string, maxChars: number) {
  return content.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export function mergeNovelCanonState(params: {
  current: unknown;
  mode: NovelMode;
  chapterIndex: number;
  chapterTitle?: string | null;
  chapterSummary?: string | null;
  chapterContent?: string | null;
  generationPlan?: unknown;
  consistencyIssues?: string[];
}): NovelCanonState {
  const state = normalizeNovelCanonState(params.current, params.mode);
  const title = readString(params.chapterTitle);
  const summary = readString(params.chapterSummary) || summarizeContent(params.chapterContent ?? "", 220);
  const label = `${params.mode === "short" ? "Beat" : "第"}${params.chapterIndex}${params.mode === "short" ? "" : "章"}`;
  const chapterLine = `${label}${title ? `《${title}》` : ""}${summary ? `：${summary}` : ""}`;
  const issues = (params.consistencyIssues ?? []).map((item) => item.trim()).filter(Boolean);

  if (params.mode === "short") {
    const beatGoal = readPlanText(params.generationPlan, "beatGoal");
    const emotionalTurn = readPlanText(params.generationPlan, "emotionalTurn");
    state.mode = "short";
    state.short.beatsProgress = mergeLimited(
      state.short.beatsProgress,
      [
        [chapterLine, beatGoal ? `目的：${beatGoal}` : "", emotionalTurn ? `情绪转折：${emotionalTurn}` : ""]
          .filter(Boolean)
          .join("；"),
      ],
      CANON_STATE_LIMITS.shortBeatsProgress,
    );
    state.short.mustResolveBeforeEnd = mergeLimited(
      state.short.mustResolveBeforeEnd,
      readPlanArray(params.generationPlan, "mustResolve"),
      CANON_STATE_LIMITS.shortMustResolveBeforeEnd,
    );
    state.short.forbiddenNewThreads = mergeLimited(
      state.short.forbiddenNewThreads,
      [...readPlanArray(params.generationPlan, "mustNotOpen"), ...issues],
      CANON_STATE_LIMITS.shortForbiddenNewThreads,
    );
  } else {
    const chapterGoal = readPlanText(params.generationPlan, "chapterGoal");
    state.mode = "long";
    state.long.volumeSummaries = mergeLimited(
      state.long.volumeSummaries,
      [chapterGoal ? `${chapterLine}；推进：${chapterGoal}` : chapterLine],
      120,
    );
    state.long.characterStates = mergeLimited(
      state.long.characterStates,
      readPlanArray(params.generationPlan, "mustUseMemories"),
      CANON_STATE_LIMITS.longCharacterStates,
    );
    state.long.openForeshadowings = mergeLimited(
      state.long.openForeshadowings,
      readPlanArray(params.generationPlan, "mustAdvanceForeshadowings"),
      CANON_STATE_LIMITS.longOpenForeshadowings,
    );
    state.long.forbiddenContradictions = mergeLimited(
      state.long.forbiddenContradictions,
      [...readPlanArray(params.generationPlan, "mustAvoid"), ...issues],
      120,
    );
  }

  state.updatedAtChapter = Math.max(state.updatedAtChapter, params.chapterIndex);
  return state;
}

type ExtractionPayloadLike = {
  summary?: string | null;
  memories?: Array<{
    kind?: string | null;
    priority?: number | null;
    content: string;
  }>;
  timelineEvents?: Array<{
    title?: string | null;
    summary: string;
    storyTime?: string | null;
  }>;
  foreshadowings?: Array<{
    title?: string | null;
    hint: string;
    payoff?: string | null;
    status?: string | null;
  }>;
  characterUpdates?: Array<{
    name: string;
    currentState?: string | null;
    goal?: string | null;
    notes?: string | null;
  }>;
};

function removeResolvedItems(items: string[], resolvedHints: string[]) {
  if (!resolvedHints.length) return items;
  return items.filter((item) => !resolvedHints.some((hint) => item.includes(hint)));
}

export function mergeCanonStateFromExtractionPayload(params: {
  current: unknown;
  mode: NovelMode;
  chapterIndex: number;
  chapterTitle?: string | null;
  payload: ExtractionPayloadLike;
}): NovelCanonState {
  const state = normalizeNovelCanonState(params.current, params.mode);
  const title = readString(params.chapterTitle);
  const summary = readString(params.payload.summary);
  const chapterLine = `${params.mode === "short" ? "Beat" : "第"}${params.chapterIndex}${params.mode === "short" ? "" : "章"}${title ? `《${title}》` : ""}${summary ? `：${summary}` : ""}`;
  const memories = params.payload.memories ?? [];
  const timelineEvents = params.payload.timelineEvents ?? [];
  const foreshadowings = params.payload.foreshadowings ?? [];
  const characterUpdates = params.payload.characterUpdates ?? [];

  if (params.mode === "short") {
    const resolvedHints = foreshadowings
      .filter((item) => item.status === "resolved")
      .map((item) => readString(item.hint))
      .filter(Boolean);
    const mustResolveAdditions = memories
      .filter((item) => item.kind === "plot_thread" || item.kind === "continuity")
      .map((item) => item.content);

    state.mode = "short";
    state.short.beatsProgress = mergeLimited(
      state.short.beatsProgress,
      [chapterLine],
      CANON_STATE_LIMITS.shortBeatsProgress,
    );
    state.short.mustResolveBeforeEnd = removeResolvedItems(
      mergeLimited(
        state.short.mustResolveBeforeEnd,
        mustResolveAdditions,
        CANON_STATE_LIMITS.shortMustResolveBeforeEnd,
      ),
      resolvedHints,
    ).slice(0, CANON_STATE_LIMITS.shortMustResolveBeforeEnd);
  } else {
    const characterStates = characterUpdates.map((item) =>
      `${item.name}：${item.currentState || item.goal || item.notes || ""}`,
    );
    const plotLines = timelineEvents.map((item) =>
      `${item.storyTime ? `${item.storyTime} ` : ""}${item.title || "事件"}：${item.summary}`,
    );
    const worldRules = memories
      .filter((item) => item.kind === "constraint" || item.kind === "continuity" || item.kind === "detail")
      .map((item) => item.content);
    const openForeshadowings = foreshadowings
      .filter((item) => item.status === "open" || item.status === "partial")
      .map((item) => `${item.title || "伏笔"}：${item.hint}${item.payoff ? `；兑现方向：${item.payoff}` : ""}`);
    const resolvedForeshadowings = foreshadowings
      .filter((item) => item.status === "resolved")
      .map((item) => `${item.title || "伏笔"}：${item.hint}${item.payoff ? `；已兑现：${item.payoff}` : ""}`);

    state.mode = "long";
    state.long.characterStates = mergeLimited(
      state.long.characterStates,
      characterStates,
      CANON_STATE_LIMITS.longCharacterStates,
    );
    state.long.volumeSummaries = mergeLimited(
      state.long.volumeSummaries,
      [chapterLine, ...plotLines],
      120,
    );
    state.long.worldRules = mergeLimited(
      state.long.worldRules,
      worldRules,
      CANON_STATE_LIMITS.longWorldRules,
    );
    state.long.openForeshadowings = removeResolvedItems(
      mergeLimited(
        state.long.openForeshadowings,
        openForeshadowings,
        CANON_STATE_LIMITS.longOpenForeshadowings,
      ),
      resolvedForeshadowings.map((item) => item.split("：").at(1) ?? item),
    ).slice(0, CANON_STATE_LIMITS.longOpenForeshadowings);
    state.long.resolvedForeshadowings = mergeLimited(
      state.long.resolvedForeshadowings,
      resolvedForeshadowings,
      160,
    );
    state.long.forbiddenContradictions = mergeLimited(
      state.long.forbiddenContradictions,
      memories
        .filter((item) => item.kind === "constraint" || item.kind === "continuity")
        .map((item) => item.content),
      120,
    );
  }

  state.updatedAtChapter = Math.max(state.updatedAtChapter, params.chapterIndex);
  return state;
}

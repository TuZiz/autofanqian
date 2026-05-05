import type { StoryOutline, StoryOutlineSegment, StoryOutlineVolume } from "./outline-draft";

export type PlanningPreset = "short" | "smart" | "long";

export type PlanningWindowConfig = {
  version: 1;
  unlockThreshold: number;
  hardMaxChapters: number;
  presets: Record<PlanningPreset, { label: string; min: number; max: number }>;
};

export const DEFAULT_PLANNING_CONFIG: PlanningWindowConfig = {
  version: 1,
  unlockThreshold: 0.7,
  hardMaxChapters: 60,
  presets: {
    short: { label: "短段 12-20章", min: 12, max: 20 },
    smart: { label: "智能 20-40章", min: 20, max: 40 },
    long: { label: "长段 40-60章", min: 40, max: 60 },
  },
};

export type ProgressivePlanningResult = {
  outline: StoryOutline;
  targetChapters: number;
  plannedUntilChapter: number;
};

function toPositiveInt(value: unknown) {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.trunc(number);
}

function maxChapterFromVolumes(outline?: Pick<StoryOutline, "volumes"> | null) {
  if (!outline?.volumes?.length) return 0;
  return Math.max(
    0,
    ...outline.volumes.flatMap((volume) => [
      toPositiveInt(volume.endChapter),
      ...(volume.segments ?? []).map((segment) => toPositiveInt(segment.endChapter)),
    ]),
  );
}

export function inferTargetChapters(outline?: StoryOutline | null) {
  return Math.max(
    toPositiveInt(outline?.targetChapters),
    toPositiveInt(outline?.totalChapters),
    maxChapterFromVolumes(outline),
  );
}

export function getPlannedUntilFromOutline(outline?: StoryOutline | null) {
  return Math.max(0, toPositiveInt(outline?.plannedUntilChapter));
}

export function getEffectivePlannedUntil(input: {
  outline?: StoryOutline | null;
  plannedUntilChapter?: number | null;
  maxWrittenChapter?: number | null;
}) {
  const planned = Math.max(
    toPositiveInt(input.plannedUntilChapter),
    getPlannedUntilFromOutline(input.outline),
    toPositiveInt(input.maxWrittenChapter),
  );

  if (planned > 0) return planned;

  const target = inferTargetChapters(input.outline);
  return Math.min(
    target || DEFAULT_PLANNING_CONFIG.presets.smart.max,
    DEFAULT_PLANNING_CONFIG.presets.smart.max,
  );
}

export function isChapterWithinPlanning(input: {
  index: number;
  outline?: StoryOutline | null;
  plannedUntilChapter?: number | null;
  maxWrittenChapter?: number | null;
}) {
  return input.index <= getEffectivePlannedUntil(input);
}

export function getPlanningPresetRange(
  preset: PlanningPreset,
  config: PlanningWindowConfig = DEFAULT_PLANNING_CONFIG,
) {
  const fallback = config.presets.smart;
  const selected = config.presets[preset] ?? fallback;
  const max = Math.min(selected.max, config.hardMaxChapters);
  const min = Math.min(selected.min, max);
  return { ...selected, min, max };
}

function clipSegment(segment: StoryOutlineSegment, plannedUntilChapter: number) {
  if (segment.startChapter > plannedUntilChapter) return null;
  const endChapter = Math.min(segment.endChapter, plannedUntilChapter);
  return {
    ...segment,
    endChapter,
    status: "planned" as const,
  };
}

function normalizeVolumeForWindow(
  volume: StoryOutlineVolume,
  index: number,
  plannedUntilChapter: number,
) {
  const startChapter = toPositiveInt(volume.startChapter) || undefined;
  const endChapter = toPositiveInt(volume.endChapter) || undefined;
  const isDetailed =
    typeof startChapter === "number"
      ? startChapter <= plannedUntilChapter
      : index === 0 ||
        (volume.segments ?? []).some((segment) => segment.startChapter <= plannedUntilChapter);
  const segments = (volume.segments ?? [])
    .map((segment) => clipSegment(segment, plannedUntilChapter))
    .filter(Boolean) as StoryOutlineSegment[];

  return {
    ...volume,
    ...(typeof startChapter === "number" ? { startChapter } : {}),
    ...(typeof endChapter === "number" ? { endChapter } : {}),
    detailLevel: isDetailed ? ("detailed" as const) : ("macro" as const),
    status: isDetailed ? ("planned" as const) : ("locked" as const),
    ...(segments.length ? { segments } : { segments: undefined }),
  };
}

export function normalizeProgressiveOutline(
  outline: StoryOutline,
  options?: {
    preset?: PlanningPreset;
    config?: PlanningWindowConfig;
    plannedUntilChapter?: number;
    targetChapters?: number;
    maxWrittenChapter?: number;
  },
): ProgressivePlanningResult {
  const config = options?.config ?? DEFAULT_PLANNING_CONFIG;
  const preset = options?.preset ?? "smart";
  const range = getPlanningPresetRange(preset, config);
  const inferredTarget = Math.max(toPositiveInt(options?.targetChapters), inferTargetChapters(outline));
  const targetChapters = Math.max(1, inferredTarget || range.max);
  const maxWrittenChapter = toPositiveInt(options?.maxWrittenChapter);
  const requestedPlannedUntil = toPositiveInt(options?.plannedUntilChapter);
  const defaultWindowEnd = Math.min(targetChapters, range.max);
  const plannedUntilChapter = Math.min(
    targetChapters,
    Math.max(requestedPlannedUntil || defaultWindowEnd, maxWrittenChapter),
  );

  const volumes = outline.volumes.map((volume, index) =>
    normalizeVolumeForWindow(volume, index, plannedUntilChapter),
  );

  return {
    targetChapters,
    plannedUntilChapter,
    outline: {
      ...outline,
      totalChapters: targetChapters,
      targetChapters,
      plannedUntilChapter,
      planningMode: "progressive",
      volumes,
    },
  };
}

export function canExtendPlanningWindow(input: {
  targetChapters: number;
  plannedUntilChapter: number;
  writtenUntilChapter: number;
  threshold?: number;
}) {
  if (input.plannedUntilChapter >= input.targetChapters) {
    return { allowed: false, reason: "已规划到长期目标章节。" };
  }

  const threshold = input.threshold ?? DEFAULT_PLANNING_CONFIG.unlockThreshold;
  const requiredChapter = Math.max(1, Math.floor(input.plannedUntilChapter * threshold));
  if (input.writtenUntilChapter < requiredChapter) {
    return {
      allowed: false,
      reason: `当前窗口写到约 ${Math.round(threshold * 100)}% 后再规划下一段（需写到第 ${requiredChapter} 章）。`,
    };
  }

  return { allowed: true, reason: "" };
}

export function getNextPlannedUntil(input: {
  targetChapters: number;
  plannedUntilChapter: number;
  preset?: PlanningPreset;
  config?: PlanningWindowConfig;
}) {
  const range = getPlanningPresetRange(input.preset ?? "smart", input.config);
  return Math.min(input.targetChapters, input.plannedUntilChapter + range.max);
}

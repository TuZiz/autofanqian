import { AI_ACTIONS } from "@/shared/ai-actions";

export const MAIN_GENERATION_ACTIONS = [
  AI_ACTIONS.chapterGenerate,
  "chapter.generate.stream",
  "regenerate.all",
  "regenerate.all.stream",
  "chapter_generate",
  "chapter_regenerate",
] as const;

export const LENGTH_REPAIR_ACTIONS = [
  "chapter_generate_length_repair",
  "chapter_generate_stream_length_repair",
] as const;

export const AUXILIARY_AI_ACTIONS = [
  "chapter.plan",
  AI_ACTIONS.chapterConsistency,
  "chapter.consistency_check",
  "chapter.consistency_repair",
  "chapter.quality_check",
  "canon.compress",
] as const;

export const GENERATION_COST_ACTIONS = [
  ...MAIN_GENERATION_ACTIONS,
  ...LENGTH_REPAIR_ACTIONS,
  ...AUXILIARY_AI_ACTIONS,
] as const;

export const OBSERVABILITY_ACTIONS = [
  ...MAIN_GENERATION_ACTIONS,
  ...AUXILIARY_AI_ACTIONS,
  ...LENGTH_REPAIR_ACTIONS,
] as const;

export type GenerationCostAction = (typeof GENERATION_COST_ACTIONS)[number];

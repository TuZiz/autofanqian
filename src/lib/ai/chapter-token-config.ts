import type { NovelMode } from "@/lib/ai/novel-canon-state";

const DEFAULT_LONG_CHAPTER_GENERATE_TOKENS = 4800;
const DEFAULT_SHORT_CHAPTER_GENERATE_TOKENS = 2600;
const DEFAULT_CHAPTER_TEMPERATURE = 0.85;

function readPositiveIntEnv(key: string) {
  const raw = process.env[key];
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readTemperatureEnv() {
  const raw = process.env.AI_CHAPTER_TEMPERATURE;
  if (!raw) return DEFAULT_CHAPTER_TEMPERATURE;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_CHAPTER_TEMPERATURE;
  return Math.min(1.5, Math.max(0, parsed));
}

function estimateShortGenerateTokens(targetWords?: number | null) {
  if (!targetWords || targetWords <= 0) return DEFAULT_SHORT_CHAPTER_GENERATE_TOKENS;
  return Math.min(5200, Math.max(1800, Math.ceil(targetWords * 1.35)));
}

export function getChapterTokenConfig(params: {
  mode: NovelMode;
  shortTargetWords?: number | null;
}) {
  const genericGenerate = readPositiveIntEnv("AI_CHAPTER_MAX_TOKENS");
  const longGenerate =
    readPositiveIntEnv("AI_LONG_CHAPTER_MAX_TOKENS") ??
    genericGenerate ??
    DEFAULT_LONG_CHAPTER_GENERATE_TOKENS;
  const shortGenerate =
    readPositiveIntEnv("AI_SHORT_CHAPTER_MAX_TOKENS") ??
    genericGenerate ??
    estimateShortGenerateTokens(params.shortTargetWords);

  if (params.mode === "short") {
    return {
      chapterPlan: 900,
      chapterGenerate: shortGenerate,
      consistencyCheck: 1200,
      contextExtract: 1600,
      temperature: readTemperatureEnv(),
    };
  }

  return {
    chapterPlan: 1200,
    chapterGenerate: longGenerate,
    consistencyCheck: 1600,
    contextExtract: 2200,
    temperature: readTemperatureEnv(),
  };
}

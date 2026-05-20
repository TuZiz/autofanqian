import "server-only";

export type ChapterAuxiliaryTimeoutAction =
  | "chapter_plan"
  | "chapter_consistency_check"
  | "chapter_consistency_repair"
  | "chapter_quality_check"
  | "canon_compress";

const DEFAULT_TIMEOUT_MS: Record<ChapterAuxiliaryTimeoutAction, number> = {
  chapter_plan: 20_000,
  chapter_consistency_check: 25_000,
  chapter_consistency_repair: 35_000,
  chapter_quality_check: 20_000,
  canon_compress: 45_000,
};

const ENV_KEYS: Record<ChapterAuxiliaryTimeoutAction, string> = {
  chapter_plan: "AI_CHAPTER_PLAN_TIMEOUT_MS",
  chapter_consistency_check: "AI_CONSISTENCY_CHECK_TIMEOUT_MS",
  chapter_consistency_repair: "AI_CONSISTENCY_REPAIR_TIMEOUT_MS",
  chapter_quality_check: "AI_QUALITY_CHECK_TIMEOUT_MS",
  canon_compress: "AI_CANON_COMPRESS_TIMEOUT_MS",
};

function readTimeoutMs(action: ChapterAuxiliaryTimeoutAction) {
  const raw = process.env[ENV_KEYS[action]]?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_TIMEOUT_MS[action];
}

export function isAuxiliaryTimeoutError(error: unknown, action?: ChapterAuxiliaryTimeoutAction) {
  if (!(error instanceof Error)) return false;
  return action
    ? error.message === `auxiliary_timeout:${action}`
    : error.message.startsWith("auxiliary_timeout:");
}

export async function withAuxiliaryTimeout<T>(
  action: ChapterAuxiliaryTimeoutAction,
  execute: () => Promise<T>,
): Promise<T> {
  const timeoutMs = readTimeoutMs(action);
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      execute(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`auxiliary_timeout:${action}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

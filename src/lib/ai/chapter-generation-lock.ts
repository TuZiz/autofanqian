type ActiveChapterGeneration = {
  key: string;
  userId: string;
  workId: string;
  index: number;
  startedAt: number;
};

const GENERATION_ABORT_HANDLERS = new Map<string, () => void>();

export function getChapterGenerationLockKey(params: {
  userId: string;
  workId: string;
  index: number;
}) {
  return `${params.userId}:${params.workId}:${params.index}`;
}

export function beginChapterGenerationLock(params: {
  userId: string;
  workId: string;
  index: number;
}) {
  const now = Date.now();
  const key = getChapterGenerationLockKey(params);
  const activeGeneration: ActiveChapterGeneration = {
    key,
    ...params,
    startedAt: now,
  };

  return { acquired: true, key: activeGeneration.key };
}

export function endChapterGenerationLock(key: string) {
  GENERATION_ABORT_HANDLERS.delete(key);
}

export function registerChapterGenerationAbortHandler(key: string, handler: () => void) {
  GENERATION_ABORT_HANDLERS.set(key, handler);
}

export function clearChapterGenerationAbortHandler(key: string) {
  GENERATION_ABORT_HANDLERS.delete(key);
}

export function requestChapterGenerationAbort(key: string) {
  const handler = GENERATION_ABORT_HANDLERS.get(key);
  if (!handler) return false;

  handler();
  return true;
}

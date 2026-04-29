type ActiveChapterGeneration = {
  key: string;
  userId: string;
  workId: string;
  index: number;
  startedAt: number;
};

const ACTIVE_GENERATIONS = new Map<string, ActiveChapterGeneration>();
const LOCK_TTL_MS = 30 * 60 * 1000;

export function getChapterGenerationLockKey(params: {
  userId: string;
  workId: string;
  index: number;
}) {
  return `${params.userId}:${params.workId}:${params.index}`;
}

function pruneExpiredGenerations(now = Date.now()) {
  for (const [key, generation] of ACTIVE_GENERATIONS.entries()) {
    if (now - generation.startedAt > LOCK_TTL_MS) {
      ACTIVE_GENERATIONS.delete(key);
    }
  }
}

export function beginChapterGenerationLock(params: {
  userId: string;
  workId: string;
  index: number;
}) {
  const now = Date.now();
  pruneExpiredGenerations(now);

  const key = getChapterGenerationLockKey(params);
  if (ACTIVE_GENERATIONS.has(key)) {
    return { acquired: false, key };
  }

  ACTIVE_GENERATIONS.set(key, {
    key,
    ...params,
    startedAt: now,
  });

  return { acquired: true, key };
}

export function endChapterGenerationLock(key: string) {
  ACTIVE_GENERATIONS.delete(key);
}

-- Production hardening: durable generation jobs and AI usage counters.

ALTER TYPE "GenerationJobStatus" ADD VALUE IF NOT EXISTS 'succeeded';
ALTER TYPE "GenerationJobStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "GenerationJobStatus" ADD VALUE IF NOT EXISTS 'stale';

CREATE TYPE "AiUsagePeriodType" AS ENUM ('minute', 'daily', 'monthly');

CREATE TABLE "AiUsageCounter" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "periodType" "AiUsagePeriodType" NOT NULL,
  "periodKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "charCount" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiUsageCounter_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiUsageCounter"
  ADD CONSTRAINT "AiUsageCounter_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AiUsageCounter_userId_periodType_periodKey_action_key"
  ON "AiUsageCounter"("userId", "periodType", "periodKey", "action");
CREATE INDEX "AiUsageCounter_userId_periodType_periodKey_idx"
  ON "AiUsageCounter"("userId", "periodType", "periodKey");
CREATE INDEX "AiUsageCounter_periodType_periodKey_idx"
  ON "AiUsageCounter"("periodType", "periodKey");

ALTER TABLE "AiQuotaReservation" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "AiQuotaReservation_userId_action_idempotencyKey_key"
  ON "AiQuotaReservation"("userId", "action", "idempotencyKey");

ALTER TABLE "GenerationJob" ADD COLUMN "userId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "workId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "chapterIndex" INTEGER;
ALTER TABLE "GenerationJob" ADD COLUMN "jobType" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "activeLockKey" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "GenerationJob" ADD COLUMN "finishedAt" TIMESTAMP(3);
ALTER TABLE "GenerationJob" ADD COLUMN "heartbeatAt" TIMESTAMP(3);

UPDATE "GenerationJob" gj
SET "workId" = gj."novelId",
    "startedAt" = COALESCE(gj."startedAt", gj."createdAt"),
    "finishedAt" = COALESCE(gj."finishedAt", gj."completedAt"),
    "heartbeatAt" = COALESCE(gj."heartbeatAt", gj."updatedAt")
WHERE gj."workId" IS NULL;

UPDATE "GenerationJob" gj
SET "userId" = w."userId"
FROM "Work" w
WHERE gj."novelId" = w."id" AND gj."userId" IS NULL;

ALTER TABLE "GenerationJob"
  ADD CONSTRAINT "GenerationJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key"
  ON "GenerationJob"("idempotencyKey");
CREATE UNIQUE INDEX "GenerationJob_activeLockKey_key"
  ON "GenerationJob"("activeLockKey");
CREATE INDEX "GenerationJob_userId_novelId_chapterIndex_action_status_idx"
  ON "GenerationJob"("userId", "novelId", "chapterIndex", "action", "status");
CREATE INDEX "GenerationJob_userId_novelId_chapterId_action_status_idx"
  ON "GenerationJob"("userId", "novelId", "chapterId", "action", "status");
CREATE INDEX "GenerationJob_status_heartbeatAt_idx"
  ON "GenerationJob"("status", "heartbeatAt");

-- Historical databases may already contain duplicate queued/running jobs for the
-- same user + work + chapter + action. Keep the newest active row and mark older
-- duplicates as stale before adding the partial unique indexes below.
WITH ranked_active_jobs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "novelId", COALESCE("chapterIndex", -1), "action"
      ORDER BY COALESCE("heartbeatAt", "updatedAt", "createdAt") DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "GenerationJob"
  WHERE "status" IN ('queued', 'running')
)
UPDATE "GenerationJob" gj
SET
  "status" = 'stale',
  "activeLockKey" = NULL,
  "finishedAt" = COALESCE(gj."finishedAt", CURRENT_TIMESTAMP),
  "completedAt" = COALESCE(gj."completedAt", CURRENT_TIMESTAMP),
  "heartbeatAt" = CURRENT_TIMESTAMP,
  "error" = COALESCE(gj."error", 'migration_duplicate_active_generation_job'),
  "errorMessage" = COALESCE(gj."errorMessage", '迁移时检测到重复活跃生成任务，已保留最新任务并将旧任务标记为过期。')
FROM ranked_active_jobs ranked
WHERE gj."id" = ranked."id"
  AND ranked.row_number > 1;

-- Chapter generation actions are mutually exclusive even if the action name
-- differs between streaming and non-streaming generation paths.
WITH ranked_generation_jobs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "novelId", COALESCE("chapterIndex", -1)
      ORDER BY COALESCE("heartbeatAt", "updatedAt", "createdAt") DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "GenerationJob"
  WHERE "status" IN ('queued', 'running')
    AND "action" IN ('chapter.generate', 'chapter.generate.stream', 'regenerate.all', 'regenerate.all.stream')
)
UPDATE "GenerationJob" gj
SET
  "status" = 'stale',
  "activeLockKey" = NULL,
  "finishedAt" = COALESCE(gj."finishedAt", CURRENT_TIMESTAMP),
  "completedAt" = COALESCE(gj."completedAt", CURRENT_TIMESTAMP),
  "heartbeatAt" = CURRENT_TIMESTAMP,
  "error" = COALESCE(gj."error", 'migration_duplicate_active_generation_job'),
  "errorMessage" = COALESCE(gj."errorMessage", '迁移时检测到重复活跃章节生成任务，已保留最新任务并将旧任务标记为过期。')
FROM ranked_generation_jobs ranked
WHERE gj."id" = ranked."id"
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX "GenerationJob_active_chapter_action_key"
  ON "GenerationJob"("userId", "novelId", COALESCE("chapterIndex", -1), "action")
  WHERE "status" IN ('queued', 'running');

CREATE UNIQUE INDEX "GenerationJob_active_chapter_generation_key"
  ON "GenerationJob"("userId", "novelId", COALESCE("chapterIndex", -1))
  WHERE "status" IN ('queued', 'running')
    AND "action" IN ('chapter.generate', 'chapter.generate.stream', 'regenerate.all', 'regenerate.all.stream');

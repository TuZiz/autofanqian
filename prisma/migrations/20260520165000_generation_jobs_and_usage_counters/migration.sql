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

CREATE UNIQUE INDEX "GenerationJob_active_chapter_action_key"
  ON "GenerationJob"("userId", "novelId", COALESCE("chapterIndex", -1), "action")
  WHERE "status" IN ('queued', 'running');

CREATE UNIQUE INDEX "GenerationJob_active_chapter_generation_key"
  ON "GenerationJob"("userId", "novelId", COALESCE("chapterIndex", -1))
  WHERE "status" IN ('queued', 'running')
    AND "action" IN ('chapter.generate', 'chapter.generate.stream', 'regenerate.all', 'regenerate.all.stream');

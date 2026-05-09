ALTER TABLE "AiUsageEvent"
  ADD COLUMN "routeId" TEXT;

ALTER TABLE "GenerationJob"
  ADD COLUMN "routeId" TEXT;

CREATE INDEX "AiUsageEvent_routeId_createdAt_idx"
  ON "AiUsageEvent"("routeId", "createdAt" DESC);

CREATE INDEX "GenerationJob_routeId_createdAt_idx"
  ON "GenerationJob"("routeId", "createdAt" DESC);

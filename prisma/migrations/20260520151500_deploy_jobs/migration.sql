-- CreateTable
CREATE TABLE "DeployJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedById" TEXT,
    "startedByEmail" TEXT,
    "currentVersion" TEXT,
    "targetVersion" TEXT,
    "commitBefore" TEXT,
    "commitAfter" TEXT,
    "log" TEXT NOT NULL DEFAULT '',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DeployJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeployJob_status_startedAt_idx" ON "DeployJob"("status", "startedAt");

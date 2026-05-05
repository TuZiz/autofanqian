-- Progressive long-form novel context model.
-- Keeps the existing "Work" table as the compatibility storage for Novel ids.

CREATE TYPE "PlanningMode" AS ENUM ('progressive');
CREATE TYPE "VolumeDetailLevel" AS ENUM ('macro', 'detailed');
CREATE TYPE "ChapterStatus" AS ENUM ('locked', 'planned', 'drafting', 'written');
CREATE TYPE "MemoryKind" AS ENUM ('fact', 'style', 'constraint', 'character_state', 'plot_thread', 'detail', 'continuity');
CREATE TYPE "ForeshadowingStatus" AS ENUM ('open', 'resolved', 'dropped');
CREATE TYPE "GenerationJobStatus" AS ENUM ('queued', 'running', 'success', 'failed');
CREATE TYPE "PromptTemplateCategory" AS ENUM ('idea', 'outline', 'chapter', 'context', 'template', 'regenerate');

ALTER TABLE "Work"
  ADD COLUMN "targetChapters" INTEGER,
  ADD COLUMN "plannedUntilChapter" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "planningMode" "PlanningMode" NOT NULL DEFAULT 'progressive',
  ADD COLUMN "rawOutline" JSONB;

ALTER TABLE "Chapter"
  ADD COLUMN "volumeId" TEXT,
  ADD COLUMN "status" "ChapterStatus" NOT NULL DEFAULT 'locked';

CREATE TABLE "Volume" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "desc" TEXT NOT NULL DEFAULT '',
  "startChapter" INTEGER,
  "endChapter" INTEGER,
  "detailLevel" "VolumeDetailLevel" NOT NULL DEFAULT 'macro',
  "status" TEXT NOT NULL DEFAULT 'locked',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Volume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  "arc" TEXT,
  "currentState" TEXT,
  "firstChapter" INTEGER,
  "lastChapter" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldSetting" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  "firstChapter" INTEGER,
  "lastUpdatedChapter" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorldSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimelineEvent" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "chapterId" TEXT,
  "chapterIndex" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT NOT NULL,
  "canonical" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Foreshadowing" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "plantedChapter" INTEGER,
  "resolvedChapter" INTEGER,
  "status" "ForeshadowingStatus" NOT NULL DEFAULT 'open',
  "hint" TEXT NOT NULL,
  "payoff" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Foreshadowing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Relationship" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "characterAId" TEXT,
  "characterBId" TEXT,
  "characterAName" TEXT NOT NULL,
  "characterBName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "conflict" TEXT,
  "recentChangeChapter" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WritingMemory" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "chapterId" TEXT,
  "kind" "MemoryKind" NOT NULL DEFAULT 'fact',
  "priority" INTEGER NOT NULL DEFAULT 50,
  "content" TEXT NOT NULL,
  "source" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChapterRevision" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChapterRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "chapterId" TEXT,
  "action" TEXT NOT NULL,
  "status" "GenerationJobStatus" NOT NULL DEFAULT 'queued',
  "providerId" TEXT,
  "modelUsed" TEXT,
  "promptTemplateKey" TEXT,
  "promptTemplateVersion" INTEGER,
  "promptSnapshot" TEXT,
  "resultSummary" TEXT,
  "error" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "category" "PromptTemplateCategory" NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Volume_novelId_order_key" ON "Volume"("novelId", "order");
CREATE INDEX "Volume_novelId_startChapter_endChapter_idx" ON "Volume"("novelId", "startChapter", "endChapter");
CREATE UNIQUE INDEX "Character_novelId_name_key" ON "Character"("novelId", "name");
CREATE INDEX "Character_novelId_role_idx" ON "Character"("novelId", "role");
CREATE UNIQUE INDEX "WorldSetting_novelId_kind_name_key" ON "WorldSetting"("novelId", "kind", "name");
CREATE INDEX "WorldSetting_novelId_kind_idx" ON "WorldSetting"("novelId", "kind");
CREATE INDEX "TimelineEvent_novelId_chapterIndex_order_idx" ON "TimelineEvent"("novelId", "chapterIndex", "order");
CREATE INDEX "TimelineEvent_chapterId_idx" ON "TimelineEvent"("chapterId");
CREATE INDEX "Foreshadowing_novelId_status_idx" ON "Foreshadowing"("novelId", "status");
CREATE INDEX "Foreshadowing_novelId_plantedChapter_idx" ON "Foreshadowing"("novelId", "plantedChapter");
CREATE INDEX "Relationship_novelId_idx" ON "Relationship"("novelId");
CREATE INDEX "Relationship_characterAId_idx" ON "Relationship"("characterAId");
CREATE INDEX "Relationship_characterBId_idx" ON "Relationship"("characterBId");
CREATE INDEX "WritingMemory_novelId_kind_priority_idx" ON "WritingMemory"("novelId", "kind", "priority");
CREATE INDEX "WritingMemory_chapterId_idx" ON "WritingMemory"("chapterId");
CREATE INDEX "ChapterRevision_workId_index_createdAt_idx" ON "ChapterRevision"("workId", "index", "createdAt" DESC);
CREATE INDEX "ChapterRevision_chapterId_createdAt_idx" ON "ChapterRevision"("chapterId", "createdAt" DESC);
CREATE INDEX "GenerationJob_novelId_action_createdAt_idx" ON "GenerationJob"("novelId", "action", "createdAt" DESC);
CREATE INDEX "GenerationJob_chapterId_idx" ON "GenerationJob"("chapterId");
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");
CREATE UNIQUE INDEX "PromptTemplate_key_version_key" ON "PromptTemplate"("key", "version");
CREATE INDEX "PromptTemplate_key_isActive_idx" ON "PromptTemplate"("key", "isActive");
CREATE INDEX "Chapter_volumeId_idx" ON "Chapter"("volumeId");

ALTER TABLE "Volume" ADD CONSTRAINT "Volume_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldSetting" ADD CONSTRAINT "WorldSetting_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Foreshadowing" ADD CONSTRAINT "Foreshadowing_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_characterAId_fkey" FOREIGN KEY ("characterAId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_characterBId_fkey" FOREIGN KEY ("characterBId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WritingMemory" ADD CONSTRAINT "WritingMemory_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingMemory" ADD CONSTRAINT "WritingMemory_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChapterRevision" ADD CONSTRAINT "ChapterRevision_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterRevision" ADD CONSTRAINT "ChapterRevision_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

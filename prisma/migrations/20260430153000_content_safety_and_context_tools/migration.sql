-- Content safety, chapter drafts/history, context libraries, and admin audit logs.

CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'super_admin');

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

ALTER TYPE "ForeshadowingStatus" ADD VALUE IF NOT EXISTS 'partial';

ALTER TABLE "Work"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Chapter"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "ChapterRevision"
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "chapterOutline" TEXT,
  ADD COLUMN "details" JSONB,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual_save';

ALTER TABLE "Character"
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "identity" TEXT,
  ADD COLUMN "personality" TEXT,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "secret" TEXT,
  ADD COLUMN "appearance" TEXT,
  ADD COLUMN "relations" JSONB,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "WorldSetting"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "TimelineEvent"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "storyTime" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Foreshadowing"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "importance" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "ChapterDraft" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "chapterId" TEXT,
  "index" INTEGER NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL DEFAULT '',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT,
  "chapterOutline" TEXT,
  "details" JSONB,
  "isSynced" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChapterDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT,
  "adminEmail" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChapterDraft_workId_index_key" ON "ChapterDraft"("workId", "index");
CREATE INDEX "ChapterDraft_workId_updatedAt_idx" ON "ChapterDraft"("workId", "updatedAt" DESC);
CREATE INDEX "ChapterDraft_chapterId_idx" ON "ChapterDraft"("chapterId");

CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt" DESC);
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);

CREATE INDEX "Work_deletedAt_idx" ON "Work"("deletedAt");
CREATE INDEX "Chapter_workId_deletedAt_idx" ON "Chapter"("workId", "deletedAt");
CREATE INDEX "Character_novelId_deletedAt_idx" ON "Character"("novelId", "deletedAt");
CREATE INDEX "WorldSetting_novelId_deletedAt_idx" ON "WorldSetting"("novelId", "deletedAt");
CREATE INDEX "TimelineEvent_novelId_deletedAt_idx" ON "TimelineEvent"("novelId", "deletedAt");
CREATE INDEX "Foreshadowing_novelId_deletedAt_idx" ON "Foreshadowing"("novelId", "deletedAt");

ALTER TABLE "ChapterDraft"
  ADD CONSTRAINT "ChapterDraft_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChapterDraft"
  ADD CONSTRAINT "ChapterDraft_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

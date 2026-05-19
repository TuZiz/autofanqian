CREATE TYPE "WorkType" AS ENUM ('long_novel', 'short_story');

ALTER TABLE "Work"
ADD COLUMN "workType" "WorkType" NOT NULL DEFAULT 'long_novel';

CREATE INDEX "Work_workType_updatedAt_idx"
ON "Work"("workType", "updatedAt" DESC);

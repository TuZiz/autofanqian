ALTER TABLE "Work"
  ADD COLUMN "outlineState" JSONB,
  ADD COLUMN "canonState" JSONB;

ALTER TABLE "Chapter"
  ADD COLUMN "plan" JSONB;

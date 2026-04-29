-- Add column (nullable first, will be backfilled then set NOT NULL)
ALTER TABLE "User" ADD COLUMN "code" INTEGER;

-- Backfill user codes deterministically (oldest users first).
WITH ordered AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "User"
)
UPDATE "User" u
SET "code" = ordered.rn::integer
FROM ordered
WHERE u."id" = ordered."id";

-- Enforce uniqueness
ALTER TABLE "User" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

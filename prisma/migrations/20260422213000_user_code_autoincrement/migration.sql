-- Remove the old range constraint (we now allow codes > 999)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_code_range";

-- Expand from SMALLINT to INTEGER for long-term growth
ALTER TABLE "User" ALTER COLUMN "code" TYPE INTEGER;

-- Make user code auto-increment (monotonic, no reuse)
CREATE SEQUENCE IF NOT EXISTS "User_code_seq";
ALTER SEQUENCE "User_code_seq" OWNED BY "User"."code";

-- Ensure the sequence continues from the current max(code) + 1
SELECT setval(
  '"User_code_seq"',
  (SELECT COALESCE(MAX("code"), 0) FROM "User") + 1,
  false
);

ALTER TABLE "User"
  ALTER COLUMN "code" SET DEFAULT nextval('"User_code_seq"');

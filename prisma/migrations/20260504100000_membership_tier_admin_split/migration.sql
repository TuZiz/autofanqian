-- Split paid membership from admin access.

CREATE TYPE "MembershipTier" AS ENUM ('default', 'plus', 'pro', 'max');

ALTER TABLE "User"
  ADD COLUMN "membershipTier" "MembershipTier" NOT NULL DEFAULT 'default';

UPDATE "User"
SET
  "membershipTier" = 'default',
  "role" = CASE
    WHEN lower("email") IN ('1606975933@qq.com', 'codex-audit@example.local') THEN 'super_admin'::"UserRole"
    ELSE 'user'::"UserRole"
  END;

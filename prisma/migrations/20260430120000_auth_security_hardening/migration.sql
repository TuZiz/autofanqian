CREATE TYPE "UserStatus" AS ENUM ('active', 'banned', 'limited', 'deleted');

ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "bannedReason" TEXT,
  ADD COLUMN "bannedAt" TIMESTAMP(3);

ALTER TABLE "EmailVerificationCode"
  ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "requestIp" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_revokedAt_expiresAt_idx" ON "UserSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "LoginAttempt_email_success_createdAt_idx" ON "LoginAttempt"("email", "success", "createdAt" DESC);
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt" DESC);
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt" DESC);
CREATE INDEX "EmailVerificationCode_email_createdAt_idx" ON "EmailVerificationCode"("email", "createdAt" DESC);
CREATE INDEX "EmailVerificationCode_requestIp_createdAt_idx" ON "EmailVerificationCode"("requestIp", "createdAt" DESC);

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

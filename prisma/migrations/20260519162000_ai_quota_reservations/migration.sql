-- CreateEnum
CREATE TYPE "AiQuotaReservationStatus" AS ENUM ('pending', 'committed', 'cancelled');

-- CreateTable
CREATE TABLE "AiQuotaReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "AiQuotaReservationStatus" NOT NULL DEFAULT 'pending',
    "estimatedTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiQuotaReservation_userId_status_expiresAt_idx" ON "AiQuotaReservation"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "AiQuotaReservation_userId_createdAt_idx" ON "AiQuotaReservation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiQuotaReservation_action_status_createdAt_idx" ON "AiQuotaReservation"("action", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AiQuotaReservation" ADD CONSTRAINT "AiQuotaReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

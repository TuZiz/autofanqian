-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('alipay');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('pending', 'paid', 'closed', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "membershipExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'alipay',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'pending',
    "outTradeNo" TEXT NOT NULL,
    "providerTradeNo" TEXT,
    "planId" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rawNotify" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_outTradeNo_key" ON "PaymentOrder"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_providerTradeNo_key" ON "PaymentOrder"("providerTradeNo");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

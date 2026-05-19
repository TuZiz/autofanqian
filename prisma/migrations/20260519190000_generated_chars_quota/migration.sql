ALTER TABLE "AiUsageEvent"
ADD COLUMN "inputChars" INTEGER,
ADD COLUMN "outputChars" INTEGER;

ALTER TABLE "AiQuotaReservation"
ADD COLUMN "estimatedOutputChars" INTEGER;

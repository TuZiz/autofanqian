-- CreateEnum
CREATE TYPE "TemplateSource" AS ENUM ('seed', 'ai', 'user', 'learned');

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CreateTemplate" (
    "id" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "source" "TemplateSource" NOT NULL DEFAULT 'seed',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreateTemplateUsage" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreateTemplateUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaGenerationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "genreId" TEXT NOT NULL,
    "tags" TEXT[],
    "platformId" TEXT,
    "dnaStyleId" TEXT,
    "wordsId" TEXT,
    "inputIdea" TEXT,
    "outputIdea" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaGenerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreateTemplate_genreId_usageCount_updatedAt_idx" ON "CreateTemplate"("genreId", "usageCount" DESC, "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "CreateTemplateUsage_templateId_createdAt_idx" ON "CreateTemplateUsage"("templateId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CreateTemplateUsage_userId_createdAt_idx" ON "CreateTemplateUsage"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IdeaGenerationEvent_genreId_createdAt_idx" ON "IdeaGenerationEvent"("genreId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IdeaGenerationEvent_userId_createdAt_idx" ON "IdeaGenerationEvent"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CreateTemplateUsage" ADD CONSTRAINT "CreateTemplateUsage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CreateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreateTemplateUsage" ADD CONSTRAINT "CreateTemplateUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaGenerationEvent" ADD CONSTRAINT "IdeaGenerationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

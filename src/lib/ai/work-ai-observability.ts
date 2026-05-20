import "server-only";

import { getAuxiliaryAiCostReport } from "@/lib/ai/auxiliary-cost-report";
import { getChapterGenerationObservability } from "@/lib/ai/chapter-generation-observability";
import { getChapterQualityReport } from "@/lib/ai/chapter-quality-report";
import { getGenerationCostReport } from "@/lib/ai/generation-cost-report";
import { getModelQualityReport } from "@/lib/ai/model-quality-report";
import { buildModelRecommendationReport } from "@/lib/ai/model-recommendation-report";
import { getWorkQualityTrend } from "@/lib/ai/work-quality-trend";
import { prisma } from "@/lib/prisma";

export type WorkAiObservabilityOptions = {
  from?: Date;
  to?: Date;
  trendLimit?: number;
  modelMinJobs?: number;
  chapterLimit?: number;
};

function clampLimit(value: number | undefined, fallback: number, max: number) {
  const normalized = Math.floor(value ?? fallback);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(1, Math.min(max, normalized));
}

function averageNullable(values: Array<number | null | undefined>) {
  const scores = values.filter((value): value is number => typeof value === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export async function getWorkAiObservability(
  workId: string,
  options: WorkAiObservabilityOptions = {},
) {
  const trendLimit = clampLimit(options.trendLimit, 30, 100);
  const modelMinJobs = clampLimit(options.modelMinJobs, 1, 100);
  const chapterLimit = clampLimit(options.chapterLimit, 100, 300);
  const latestChapter = await prisma.chapter.findFirst({
    where: { workId, deletedAt: null },
    orderBy: { index: "desc" },
    select: { index: true },
  });

  const [
    qualityTrend,
    modelQuality,
    auxiliaryCost,
    generationCost,
    chapterGeneration,
    latestChapterReport,
  ] = await Promise.all([
    getWorkQualityTrend(workId, {
      limit: trendLimit,
      orderBy: "chapterIndex",
      from: options.from,
      to: options.to,
    }),
    getModelQualityReport(workId, {
      from: options.from,
      to: options.to,
      minJobs: modelMinJobs,
    }),
    getAuxiliaryAiCostReport(workId, { from: options.from, to: options.to }),
    getGenerationCostReport(workId, { from: options.from, to: options.to }),
    getChapterGenerationObservability(workId, {
      from: options.from,
      to: options.to,
      limit: chapterLimit,
    }),
    latestChapter
      ? getChapterQualityReport(workId, latestChapter.index).then((report) => ({
          chapterIndex: latestChapter.index,
          ...report,
        }))
      : Promise.resolve(null),
  ]);
  const modelRecommendation = buildModelRecommendationReport({
    modelQualityReport: modelQuality,
    byModel: generationCost.byModel,
  });
  const summary = {
    latestChapterIndex: latestChapter?.index ?? null,
    avgQualityScore: averageNullable(qualityTrend.map((item) => item.qualityScore)),
    avgConsistencyScore: averageNullable(qualityTrend.map((item) => item.consistencyScore)),
    totalGenerationTokens: generationCost.totalTokens,
    totalAuxiliaryTokens: auxiliaryCost.totalTokens,
    repairedChapterCount: chapterGeneration.filter((item) => item.repaired || item.repairSucceeded)
      .length,
    lengthRepairedChapterCount: chapterGeneration.filter(
      (item) => item.lengthRepaired || item.lengthRepairSucceeded,
    ).length,
    bestQualityModel: modelRecommendation.bestQuality,
    bestValueModel: modelRecommendation.bestValue,
    fastestModel: modelRecommendation.fastest,
  };

  return {
    summary,
    qualityTrend,
    modelQuality,
    modelRecommendation,
    auxiliaryCost,
    generationCost,
    chapterGeneration,
    latestChapterReport,
  };
}

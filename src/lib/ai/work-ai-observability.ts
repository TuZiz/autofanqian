import "server-only";

import { getAuxiliaryAiCostReport } from "@/lib/ai/auxiliary-cost-report";
import { getChapterQualityReport } from "@/lib/ai/chapter-quality-report";
import { getModelQualityReport } from "@/lib/ai/model-quality-report";
import { getWorkQualityTrend } from "@/lib/ai/work-quality-trend";
import { prisma } from "@/lib/prisma";

export type WorkAiObservabilityOptions = {
  from?: Date;
  to?: Date;
  trendLimit?: number;
  modelMinJobs?: number;
};

export async function getWorkAiObservability(
  workId: string,
  options: WorkAiObservabilityOptions = {},
) {
  const trendLimit = Math.max(1, Math.min(100, Math.floor(options.trendLimit ?? 30)));
  const modelMinJobs = Math.max(1, Math.min(100, Math.floor(options.modelMinJobs ?? 1)));
  const latestChapter = await prisma.chapter.findFirst({
    where: { workId, deletedAt: null },
    orderBy: { index: "desc" },
    select: { index: true },
  });

  const [qualityTrend, modelQuality, auxiliaryCost, latestChapterReport] = await Promise.all([
    getWorkQualityTrend(workId, { limit: trendLimit, orderBy: "chapterIndex" }),
    getModelQualityReport(workId, {
      from: options.from,
      to: options.to,
      minJobs: modelMinJobs,
    }),
    getAuxiliaryAiCostReport(workId, { from: options.from, to: options.to }),
    latestChapter
      ? getChapterQualityReport(workId, latestChapter.index).then((report) => ({
          chapterIndex: latestChapter.index,
          ...report,
        }))
      : Promise.resolve(null),
  ]);

  return {
    qualityTrend,
    modelQuality,
    auxiliaryCost,
    latestChapterReport,
  };
}

import type { AuxiliaryAiCostReport, GlobalAuxiliaryAiCostReport } from "@/lib/ai/auxiliary-cost-report";
import type { ChapterGenerationObservabilityItem } from "@/lib/ai/chapter-generation-observability";
import type { ChapterQualityReport } from "@/lib/ai/chapter-quality-report";
import type { ModelQualityReportItem } from "@/lib/ai/model-quality-report";
import type { ModelRecommendationReport } from "@/lib/ai/model-recommendation-report";
import type { WorkQualityTrendItem } from "@/lib/ai/work-quality-trend";

export type WorkAiObservabilitySummary = {
  latestChapterIndex: number | null;
  avgQualityScore: number | null;
  avgConsistencyScore: number | null;
  totalGenerationTokens: number;
  totalAuxiliaryTokens: number;
  repairedChapterCount: number;
  lengthRepairedChapterCount: number;
  bestQualityModel: ModelRecommendationReport["bestQuality"];
  bestValueModel: ModelRecommendationReport["bestValue"];
  fastestModel: ModelRecommendationReport["fastest"];
};

export type WorkAiObservabilityData = {
  summary: WorkAiObservabilitySummary;
  qualityTrend: WorkQualityTrendItem[];
  modelQuality: ModelQualityReportItem[];
  modelRecommendation: ModelRecommendationReport;
  auxiliaryCost: AuxiliaryAiCostReport;
  generationCost: Pick<
    GlobalAuxiliaryAiCostReport,
    "totalTokens" | "jobCount" | "avgTokensPerJob" | "byAction" | "byProvider" | "byModel"
  >;
  chapterGeneration: ChapterGenerationObservabilityItem[];
  latestChapterReport: (ChapterQualityReport & { chapterIndex: number }) | null;
};

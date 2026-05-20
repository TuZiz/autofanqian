import "server-only";

import type { AuxiliaryAiCostDimensionItem } from "@/lib/ai/auxiliary-cost-report";
import type { ModelQualityReportItem } from "@/lib/ai/model-quality-report";

export type ModelRecommendation = {
  providerId: string | null;
  modelUsed: string | null;
  reason: string;
};

export type ModelRecommendationReport = {
  bestQuality: ModelRecommendation | null;
  bestValue: ModelRecommendation | null;
  fastest: ModelRecommendation | null;
  notRecommended: ModelRecommendation[];
};

function modelKey(item: { providerId?: string | null; modelUsed?: string | null }) {
  return `${item.providerId ?? "unknown"}:${item.modelUsed ?? "unknown"}`;
}

function enoughSample(item: ModelQualityReportItem) {
  return !item.sampleWarning && item.jobCount >= 3;
}

function averageQuality(item: ModelQualityReportItem) {
  const scores = [item.avgConsistencyScore, item.avgQualityScore].filter(
    (score): score is number => typeof score === "number",
  );
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

function toRecommendation(item: ModelQualityReportItem, reason: string): ModelRecommendation {
  return {
    providerId: item.providerId,
    modelUsed: item.modelUsed,
    reason,
  };
}

export function buildModelRecommendationReport(params: {
  modelQualityReport: ModelQualityReportItem[];
  byModel: AuxiliaryAiCostDimensionItem[];
}): ModelRecommendationReport {
  const costByModel = new Map(params.byModel.map((item) => [modelKey(item), item]));
  const eligible = params.modelQualityReport.filter(enoughSample);
  const qualityRanked = eligible
    .map((item) => ({ item, score: averageQuality(item) }))
    .filter((entry): entry is { item: ModelQualityReportItem; score: number } => entry.score !== null)
    .sort((left, right) => right.score - left.score);
  const valueRanked = qualityRanked
    .map((entry) => {
      const cost = costByModel.get(modelKey(entry.item));
      const avgTokens = cost?.avgTokensPerJob || entry.item.totalTokens / Math.max(1, entry.item.jobCount);
      return {
        item: entry.item,
        value: avgTokens > 0 ? entry.score / avgTokens : 0,
      };
    })
    .sort((left, right) => right.value - left.value);
  const fastest = [...eligible]
    .filter((item) => typeof item.avgDurationMs === "number")
    .sort((left, right) => (left.avgDurationMs ?? Infinity) - (right.avgDurationMs ?? Infinity))[0];
  const durations = eligible
    .map((item) => item.avgDurationMs)
    .filter((duration): duration is number => typeof duration === "number");
  const avgDuration = durations.length
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : null;

  return {
    bestQuality: qualityRanked[0]
      ? toRecommendation(qualityRanked[0].item, `综合质量均分 ${Math.round(qualityRanked[0].score)}`)
      : null,
    bestValue: valueRanked[0]
      ? toRecommendation(valueRanked[0].item, "质量与 token 成本比例较优")
      : null,
    fastest: fastest ? toRecommendation(fastest, `平均耗时 ${fastest.avgDurationMs}ms`) : null,
    notRecommended: eligible
      .filter((item) => {
        const score = averageQuality(item);
        const slow = avgDuration !== null && (item.avgDurationMs ?? 0) > avgDuration * 1.8;
        return (score !== null && score < 70) || slow;
      })
      .map((item) => {
        const score = averageQuality(item);
        return toRecommendation(
          item,
          score !== null && score < 70 ? "样本充足但质量低于 70" : "样本充足但耗时明显偏高",
        );
      }),
  };
}

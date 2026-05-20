import "server-only";

import { getGlobalAuxiliaryAiCostReport, type AuxiliaryAiCostReportRange } from "@/lib/ai/auxiliary-cost-report";
import { GENERATION_COST_ACTIONS } from "@/lib/ai/generation-actions";

export async function getGenerationCostReport(
  workId: string,
  range: AuxiliaryAiCostReportRange = {},
) {
  const report = await getGlobalAuxiliaryAiCostReport({
    ...range,
    workId,
    actions: GENERATION_COST_ACTIONS,
  });

  return {
    totalTokens: report.totalTokens,
    jobCount: report.jobCount,
    avgTokensPerJob: report.avgTokensPerJob,
    byAction: report.byAction,
    byProvider: report.byProvider,
    byModel: report.byModel,
  };
}

import type { WorkAiObservabilityData } from "@/lib/workbench/ai-observability-types";

type CsvCell = boolean | number | string | null | undefined;

function escapeCsvCell(value: CsvCell) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: CsvCell[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function modelLabel(providerId?: string | null, modelUsed?: string | null) {
  return [providerId, modelUsed].filter(Boolean).join(" / ");
}

export function exportQualityTrendCsv(data: WorkAiObservabilityData["qualityTrend"]) {
  return toCsv(
    ["章节", "一致性分", "质量分", "一致性问题", "质量问题", "一致性模型", "质量模型"],
    data.map((row) => [
      row.chapterIndex,
      row.consistencyScore,
      row.qualityScore,
      row.consistencyIssues.join("；"),
      row.qualityIssues.join("；"),
      modelLabel(row.consistencyProviderId, row.consistencyModelUsed),
      modelLabel(row.qualityProviderId, row.qualityModelUsed),
    ]),
  );
}

export function exportModelQualityCsv(data: WorkAiObservabilityData["modelQuality"]) {
  return toCsv(
    [
      "Provider",
      "Model",
      "一致性均分",
      "质量均分",
      "一致性样本",
      "质量样本",
      "Token",
      "平均耗时",
      "提示",
    ],
    data.map((row) => [
      row.providerId,
      row.modelUsed,
      row.avgConsistencyScore,
      row.avgQualityScore,
      row.consistencyJobCount,
      row.qualityJobCount,
      row.totalTokens,
      row.avgDurationMs,
      row.sampleWarning,
    ]),
  );
}

export function exportGenerationCostCsv(data: WorkAiObservabilityData["generationCost"]) {
  return toCsv(
    ["维度", "名称", "Provider", "Model", "Token", "输入 Token", "输出 Token", "Job", "平均 Token"],
    [
      ...data.byAction.map((row) => [
        "Action",
        row.action,
        "",
        "",
        row.totalTokens,
        row.inputTokens,
        row.outputTokens,
        row.jobCount,
        row.avgTokensPerJob,
      ]),
      ...data.byModel.map((row) => [
        "Model",
        modelLabel(row.providerId, row.modelUsed),
        row.providerId,
        row.modelUsed,
        row.totalTokens,
        row.inputTokens,
        row.outputTokens,
        row.jobCount,
        row.avgTokensPerJob,
      ]),
    ],
  );
}

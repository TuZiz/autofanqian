"use client";

import type { ReactNode } from "react";

import type { AuxiliaryAiCostDimensionItem, AuxiliaryAiCostReportItem } from "@/lib/ai/auxiliary-cost-report";
import type { WorkAiObservabilityData } from "@/lib/workbench/ai-observability-types";

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number") return "—";
  return `${value.toLocaleString("zh-CN")}${suffix}`;
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? `${value}` : "—";
}

function formatBool(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value ? "是" : "否";
}

function modelLabel(providerId?: string | null, modelUsed?: string | null) {
  if (!providerId && !modelUsed) return "—";
  return [providerId, modelUsed].filter(Boolean).join(" / ");
}

function compactList(items: string[] | undefined, empty = "—") {
  if (!items?.length) return empty;
  return items.slice(0, 3).join("；");
}

export function Panel({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-black text-[var(--theme-text-strong)]">{title}</h2>
          <p className="text-xs font-semibold text-[var(--theme-text-muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function QualityTrendTable({ rows }: { rows: WorkAiObservabilityData["qualityTrend"] }) {
  return (
    <Panel title="质量趋势" subtitle="按章节查看一致性、质量分、问题和评分模型。">
      <table className="w-full min-w-[980px] text-left text-xs">
        <TableHead columns={["章节", "一致性", "质量", "一致性问题", "质量问题", "Provider / Model"]} />
        <tbody>{rows.map((row) => (
          <tr key={row.chapterIndex} className="border-t border-[var(--theme-border)]">
            <Cell>第 {row.chapterIndex} 章</Cell>
            <Cell>{formatScore(row.consistencyScore)}</Cell>
            <Cell>{formatScore(row.qualityScore)}</Cell>
            <Cell>{compactList(row.consistencyIssues)}</Cell>
            <Cell>{compactList(row.qualityIssues)}</Cell>
            <Cell>{modelLabel(row.qualityProviderId ?? row.consistencyProviderId, row.qualityModelUsed ?? row.consistencyModelUsed)}</Cell>
          </tr>
        ))}</tbody>
      </table>
      {!rows.length ? <TableEmpty label="当前筛选范围内暂无质量趋势。" /> : null}
    </Panel>
  );
}

export function ModelQualityTable({ rows }: { rows: WorkAiObservabilityData["modelQuality"] }) {
  return (
    <Panel title="模型质量" subtitle="比较模型评分、样本量、token 和耗时。">
      <table className="w-full min-w-[980px] text-left text-xs">
        <TableHead columns={["Provider", "Model", "一致性均分", "质量均分", "一致性样本", "质量样本", "Token", "均耗时", "提示"]} />
        <tbody>{rows.map((row) => (
          <tr key={`${row.providerId}-${row.modelUsed}`} className="border-t border-[var(--theme-border)]">
            <Cell>{row.providerId ?? "—"}</Cell>
            <Cell>{row.modelUsed ?? "—"}</Cell>
            <Cell>{formatScore(row.avgConsistencyScore)}</Cell>
            <Cell>{formatScore(row.avgQualityScore)}</Cell>
            <Cell>{formatNumber(row.consistencyJobCount)}</Cell>
            <Cell>{formatNumber(row.qualityJobCount)}</Cell>
            <Cell>{formatNumber(row.totalTokens)}</Cell>
            <Cell>{formatNumber(row.avgDurationMs, "ms")}</Cell>
            <Cell>{row.sampleWarning ?? "—"}</Cell>
          </tr>
        ))}</tbody>
      </table>
      {!rows.length ? <TableEmpty label="暂无可比较的模型质量数据。" /> : null}
    </Panel>
  );
}

export function ChapterGenerationTable({ rows }: { rows: WorkAiObservabilityData["chapterGeneration"] }) {
  return (
    <Panel title="章节生成观测" subtitle="关联正文生成、评分、修复和长度修复状态。">
      <table className="w-full min-w-[1040px] text-left text-xs">
        <TableHead columns={["章节", "生成模型", "Token", "耗时", "一致性", "质量", "生成成功", "生成失败", "连续性修复", "长度修复"]} />
        <tbody>{rows.map((row) => (
          <tr key={row.chapterIndex} className="border-t border-[var(--theme-border)]">
            <Cell>第 {row.chapterIndex} 章</Cell>
            <Cell>{modelLabel(row.generateProviderId, row.generateModelUsed)}</Cell>
            <Cell>{formatNumber(row.generateTokens)}</Cell>
            <Cell>{formatNumber(row.generateDurationMs, "ms")}</Cell>
            <Cell>{formatScore(row.consistencyScore)}</Cell>
            <Cell>{formatScore(row.qualityScore)}</Cell>
            <Cell>{formatBool(row.generateSucceeded)}</Cell>
            <Cell>{formatBool(row.generateFailed)}</Cell>
            <Cell>{formatBool(row.repairSucceeded)}</Cell>
            <Cell>{formatBool(row.lengthRepairSucceeded)}</Cell>
          </tr>
        ))}</tbody>
      </table>
      {!rows.length ? <TableEmpty label="当前筛选范围内暂无章节生成记录。" /> : null}
    </Panel>
  );
}

export function CostBreakdown({
  byAction,
  byModel,
  totalTokens,
}: {
  byAction: AuxiliaryAiCostReportItem[];
  byModel: AuxiliaryAiCostDimensionItem[];
  totalTokens: number;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Panel title="成本构成：Action" subtitle={`总生成成本 ${formatNumber(totalTokens)} token`}>
        <CostTable rows={byAction.map((row) => ({ label: row.action, totalTokens: row.totalTokens, jobCount: row.jobCount, avgTokensPerJob: row.avgTokensPerJob }))} />
      </Panel>
      <Panel title="成本构成：Model" subtitle="正文 + 辅助 AI 的模型维度成本。">
        <CostTable rows={byModel.map((row) => ({ label: modelLabel(row.providerId, row.modelUsed), totalTokens: row.totalTokens, jobCount: row.jobCount, avgTokensPerJob: row.avgTokensPerJob }))} />
      </Panel>
    </section>
  );
}

function CostTable({ rows }: { rows: Array<{ label: string; totalTokens: number; jobCount: number; avgTokensPerJob: number }> }) {
  return (
    <table className="w-full min-w-[560px] text-left text-xs">
      <TableHead columns={["维度", "Token", "Job", "均值"]} />
      <tbody>{rows.map((row) => (
        <tr key={row.label} className="border-t border-[var(--theme-border)]">
          <Cell>{row.label}</Cell>
          <Cell>{formatNumber(row.totalTokens)}</Cell>
          <Cell>{formatNumber(row.jobCount)}</Cell>
          <Cell>{formatNumber(row.avgTokensPerJob)}</Cell>
        </tr>
      ))}</tbody>
    </table>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
        {columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}
      </tr>
    </thead>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="max-w-[280px] px-3 py-3 align-top font-semibold leading-5 text-[var(--theme-text-secondary)]">{children}</td>;
}

function TableEmpty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm font-bold text-[var(--theme-text-muted)]">{label}</div>;
}

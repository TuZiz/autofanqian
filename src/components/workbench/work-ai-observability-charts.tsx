"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { WorkAiObservabilityData } from "@/lib/workbench/ai-observability-types";

type QualityTrend = WorkAiObservabilityData["qualityTrend"];
type ModelQuality = WorkAiObservabilityData["modelQuality"];
type GenerationCost = WorkAiObservabilityData["generationCost"];

const AXIS_COLOR = "var(--theme-text-muted)";
const GRID_COLOR = "color-mix(in srgb, var(--theme-border) 72%, transparent)";
const QUALITY_COLOR = "#10b981";
const CONSISTENCY_COLOR = "#14b8a6";
const TOKEN_COLOR = "#0f766e";
const VALUE_COLOR = "#f59e0b";

function chartModelLabel(providerId?: string | null, modelUsed?: string | null) {
  if (!providerId && !modelUsed) return "未知模型";
  return [providerId, modelUsed].filter(Boolean).join(" / ");
}

function compactLabel(value: string, max = 20) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function compactRows<T>(
  rows: T[],
  getLabel: (row: T) => string,
  getTokens: (row: T) => number,
) {
  const sorted = [...rows].sort((left, right) => getTokens(right) - getTokens(left));
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const mapped = top.map((row) => ({
    label: compactLabel(getLabel(row)),
    fullLabel: getLabel(row),
    totalTokens: getTokens(row),
  }));
  const otherTokens = rest.reduce((sum, row) => sum + getTokens(row), 0);
  if (otherTokens > 0) {
    mapped.push({ label: "其他", fullLabel: "其他", totalTokens: otherTokens });
  }
  return mapped;
}

function ChartPanel({
  children,
  empty,
  subtitle,
  title,
}: {
  children: ReactNode;
  empty: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-black text-[var(--theme-text-strong)]">{title}</h2>
        <p className="text-xs font-semibold text-[var(--theme-text-muted)]">{subtitle}</p>
      </div>
      {empty ? (
        <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-muted)] p-8 text-center text-sm font-bold text-[var(--theme-text-muted)]">
          暂无可视化数据。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="h-72 min-w-[640px]">{children}</div>
        </div>
      )}
    </section>
  );
}

export function QualityTrendChart({ qualityTrend }: { qualityTrend: QualityTrend }) {
  const data = qualityTrend.map((item) => ({
    chapterIndex: item.chapterIndex,
    consistencyScore: item.consistencyScore,
    qualityScore: item.qualityScore,
  }));

  return (
    <ChartPanel
      title="质量趋势图"
      subtitle="按章节对比一致性分和质量分。"
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 18, top: 12, bottom: 4 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="chapterIndex"
            tickFormatter={(value) => `第${value}章`}
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              value ?? "—",
              name === "consistencyScore" ? "一致性" : "质量",
            ]}
            labelFormatter={(value) => `第 ${value} 章`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="consistencyScore"
            name="一致性"
            stroke={CONSISTENCY_COLOR}
            strokeWidth={3}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="qualityScore"
            name="质量"
            stroke={QUALITY_COLOR}
            strokeWidth={3}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function CostByActionChart({
  byAction,
}: {
  byAction: GenerationCost["byAction"];
}) {
  const data = compactRows(byAction, (row) => row.action, (row) => row.totalTokens);

  return (
    <ChartPanel
      title="Action 成本图"
      subtitle="按动作聚合 token 消耗，前 10 项之外合并为其他。"
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 18, top: 12, bottom: 20 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [value, "Token"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""} />
          <Bar dataKey="totalTokens" name="Token" fill={TOKEN_COLOR} radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function CostByModelChart({ byModel }: { byModel: GenerationCost["byModel"] }) {
  const data = compactRows(
    byModel,
    (row) => chartModelLabel(row.providerId, row.modelUsed),
    (row) => row.totalTokens,
  );

  return (
    <ChartPanel
      title="模型成本图"
      subtitle="按 Provider / Model 聚合 token 消耗。"
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 18, top: 12, bottom: 4 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 6" horizontal={false} />
          <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value) => [value, "Token"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""} />
          <Bar dataKey="totalTokens" name="Token" fill={CONSISTENCY_COLOR} radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function ModelQualityValueChart({
  byModel,
  modelQuality,
}: {
  byModel: GenerationCost["byModel"];
  modelQuality: ModelQuality;
}) {
  const data = modelQuality
    .map((item) => {
      const cost = byModel.find(
        (row) => row.providerId === item.providerId && row.modelUsed === item.modelUsed,
      );
      return {
        avgQualityScore: item.avgQualityScore,
        avgTokensPerJob: cost?.avgTokensPerJob ?? item.totalTokens,
        jobCount: item.qualityJobCount || item.consistencyJobCount || cost?.jobCount || 1,
        label: chartModelLabel(item.providerId, item.modelUsed),
      };
    })
    .filter(
      (item) =>
        typeof item.avgQualityScore === "number" &&
        typeof item.avgTokensPerJob === "number" &&
        Number.isFinite(item.avgTokensPerJob),
    );

  return (
    <ChartPanel
      title="模型性价比图"
      subtitle="横轴为平均 token，纵轴为质量均分，越靠左上越值得优先观察。"
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: 0, right: 18, top: 12, bottom: 8 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 6" />
          <XAxis
            type="number"
            dataKey="avgTokensPerJob"
            name="平均 Token"
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="avgQualityScore"
            name="质量均分"
            domain={[0, 100]}
            tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis type="number" dataKey="jobCount" range={[80, 420]} />
          <Tooltip
            cursor={{ strokeDasharray: "4 4" }}
            formatter={(value, name) => [
              value,
              name === "avgTokensPerJob" ? "平均 Token" : name === "avgQualityScore" ? "质量均分" : "样本",
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
          />
          <Scatter name="模型" data={data} fill={VALUE_COLOR} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

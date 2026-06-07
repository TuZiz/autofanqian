"use client";

import type { ComponentType, ReactNode } from "react";
import { BookMarked, Compass, Tags, Users } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type IdeaAnalysisPanelProps = {
  analysis: NonNullable<DashboardCreateController["ideaAnalysis"]>;
};

export function IdeaAnalysisPanel({ analysis }: IdeaAnalysisPanelProps) {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" />
          核心判断
        </div>
        <p className="mt-2 text-sm font-bold leading-6 text-[var(--theme-text-strong)]">
          {analysis.oneLinePitch}
        </p>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <InfoBlock
          icon={BookMarked}
          label="推荐书名"
          content={
            <div className="flex flex-wrap gap-1.5">
              {analysis.recommendedTitles.map((title) => (
                <span
                  key={title}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-text-secondary)]"
                >
                  {title}
                </span>
              ))}
            </div>
          }
        />

        <InfoBlock
          icon={Users}
          label="目标读者"
          content={
            <p className="text-sm leading-6 text-[var(--theme-text-secondary)]">
              {analysis.targetReaders}
            </p>
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <InfoBlock
          icon={Compass}
          label="核心卖点"
          content={
            <div className="space-y-2">
              {analysis.coreSellingPoints.slice(0, 4).map((point, index) => (
                <div
                  key={point}
                  className="flex gap-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-2.5"
                >
                  <span className="mt-0.5 text-[11px] font-bold text-[var(--theme-brand-text)]">
                    0{index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--theme-text-secondary)]">{point}</p>
                </div>
              ))}
            </div>
          }
        />

        <InfoBlock
          icon={Tags}
          label="类型关键词"
          content={
            <div className="flex flex-wrap gap-1.5">
              {analysis.keyPhrases.map((phrase) => (
                <span
                  key={phrase}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-text-secondary)]"
                >
                  {phrase}
                </span>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}

function InfoBlock({
  content,
  icon: Icon,
  label,
}: {
  content: ReactNode;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2">{content}</div>
    </section>
  );
}

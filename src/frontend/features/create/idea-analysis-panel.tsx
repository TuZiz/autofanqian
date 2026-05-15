"use client";

import type { ComponentType, ReactNode } from "react";
import { BookMarked, Compass, Tags, Users } from "lucide-react";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type IdeaAnalysisPanelProps = {
  analysis: NonNullable<DashboardCreateController["ideaAnalysis"]>;
};

export function IdeaAnalysisPanel({ analysis }: IdeaAnalysisPanelProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
          <Compass className="h-3.5 w-3.5" />
          核心判断
        </div>
        <p className="mt-3 text-base font-semibold leading-7 text-[var(--theme-text-strong)]">
          {analysis.oneLinePitch}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock
          icon={BookMarked}
          label="推荐书名"
          content={
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedTitles.map((title) => (
                <span
                  key={title}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-1.5 text-sm font-medium text-[var(--theme-text-primary)]"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <InfoBlock
          icon={Compass}
          label="核心卖点"
          content={
            <div className="space-y-2">
              {analysis.coreSellingPoints.slice(0, 4).map((point, index) => (
                <div
                  key={point}
                  className="flex gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3.5 py-3"
                >
                  <span className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
            <div className="flex flex-wrap gap-2">
              {analysis.keyPhrases.map((phrase) => (
                <span
                  key={phrase}
                  className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-1 text-xs font-medium text-[var(--theme-text-secondary)]"
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
    <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-3">{content}</div>
    </section>
  );
}

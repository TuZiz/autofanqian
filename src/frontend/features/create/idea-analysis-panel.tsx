"use client";

import type { DashboardCreateController } from "@/lib/create/use-dashboard-create";

type IdeaAnalysisPanelProps = {
  analysis: NonNullable<DashboardCreateController["ideaAnalysis"]>;
};

export function IdeaAnalysisPanel({ analysis }: IdeaAnalysisPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold leading-relaxed text-[var(--theme-text-primary)]">
        {analysis.oneLinePitch}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
            推荐书名
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendedTitles.map((title) => (
              <span
                key={title}
                className="bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {title}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
            核心卖点
          </div>
          <div className="space-y-2">
            {analysis.coreSellingPoints.slice(0, 3).map((point) => (
              <div
                key={point}
                className="bg-emerald-50/80 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

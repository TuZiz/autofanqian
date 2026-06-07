"use client";

import { useParams } from "next/navigation";

import { WorkAiObservabilityView } from "@/components/workbench/work-ai-observability-view";

export default function DashboardNovelAiObservabilityPage() {
  const params = useParams();
  const workId = typeof params?.id === "string" ? params.id : "";

  if (!workId) {
    return (
      <main className="app-work-surface flex min-h-dvh items-center justify-center px-4 text-[var(--theme-text-primary)]">
        <section className="w-full max-w-md rounded-[1.4rem] border border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] p-6 text-center shadow-sm">
          <p className="text-sm font-black text-[var(--theme-danger-text)]">
            AI 观测页面参数异常
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--theme-text-secondary)]">
            当前路由缺少作品 ID，无法加载 AI 观测数据。
          </p>
        </section>
      </main>
    );
  }

  return <WorkAiObservabilityView workId={workId} />;
}

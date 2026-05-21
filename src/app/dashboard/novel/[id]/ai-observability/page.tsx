"use client";

import { useParams } from "next/navigation";

import { WorkAiObservabilityView } from "@/components/workbench/work-ai-observability-view";

export default function DashboardNovelAiObservabilityPage() {
  const params = useParams();
  const workId = typeof params?.id === "string" ? params.id : "";

  if (!workId) {
    return (
      <main className="app-work-surface flex min-h-dvh items-center justify-center px-4 text-[var(--theme-text-primary)]">
        <section className="w-full max-w-md rounded-[1.4rem] border border-red-200 bg-red-50/90 p-6 text-center shadow-sm dark:border-red-500/25 dark:bg-red-500/10">
          <p className="text-sm font-black text-red-700 dark:text-red-200">
            AI 观测页面参数异常
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-red-600/80 dark:text-red-200/70">
            当前路由缺少作品 ID，无法加载 AI 观测数据。
          </p>
        </section>
      </main>
    );
  }

  return <WorkAiObservabilityView workId={workId} />;
}

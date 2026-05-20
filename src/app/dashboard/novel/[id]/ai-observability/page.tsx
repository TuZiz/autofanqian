"use client";

import { useParams } from "next/navigation";

import { WorkAiObservabilityView } from "@/components/workbench/work-ai-observability-view";

export default function DashboardNovelAiObservabilityPage() {
  const params = useParams();
  const workId = typeof params?.id === "string" ? params.id : "";

  return <WorkAiObservabilityView workId={workId} />;
}

"use client";

import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { AiModelConfigView } from "@/components/admin/ai-model-config-view";
import { useAiModelConfig } from "@/lib/admin/use-ai-model-config";

export default function DashboardAdminAiModelPage() {
  const model = useAiModelConfig();

  if (model.bootstrapLoading) {
    return <AdminStateScreen message="正在加载 AI 模型配置..." />;
  }

  return <AiModelConfigView model={model} />;
}

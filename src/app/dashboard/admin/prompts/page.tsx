"use client";

import { AdminPromptsView } from "@/components/admin/admin-prompts-view";
import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { useAdminPrompts } from "@/lib/admin/use-admin-prompts";

export default function DashboardAdminPromptsPage() {
  const prompts = useAdminPrompts();

  if (prompts.loading && !prompts.templates.length) {
    return <AdminStateScreen message="正在加载提示词模板中心..." />;
  }

  return <AdminPromptsView prompts={prompts} />;
}

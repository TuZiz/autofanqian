"use client";

import { CreateStateScreen } from "@/components/create/create-state-screen";
import { DashboardCreateView } from "@/components/create/dashboard-create-view";
import { useDashboardCreate } from "@/lib/create/use-dashboard-create";

export default function DashboardCreatePage() {
  const create = useDashboardCreate();

  if (create.bootstrapLoading) {
    return <CreateStateScreen message="正在加载创作配置..." spinning />;
  }

  if (!create.config) {
    return <CreateStateScreen message="创作配置加载失败，请刷新重试。" />;
  }

  return <DashboardCreateView create={create} />;
}

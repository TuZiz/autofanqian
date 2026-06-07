"use client";

import { RefreshCw, Route, Save } from "lucide-react";

import { Button } from "@/components/design-system";
import { getDefaultAiModelConfig } from "@/lib/admin/ai-model-utils";
import type { AiModelConfigController } from "@/lib/admin/use-ai-model-config";
import { allRoutes, routeGroups } from "./ai-model-config-data";
import { EnvReferencePanel, PhysicalProviderPanel, RouteStatusPanel } from "./ai-model-provider-panels";
import { MetricPill } from "./ai-model-config-shared";
import { RouteMatrixGroup } from "./ai-model-route-matrix";
import { AdminWorkspaceShell } from "./admin-workspace-shell";

type AiModelConfigViewProps = {
  model: AiModelConfigController;
};

export function AiModelConfigView({ model }: AiModelConfigViewProps) {
  const configuredRoutes = model.providers.filter((provider) => provider.configured).length;
  const configuredPhysical = model.physicalProviders.filter((provider) => provider.configured).length;
  const overrideCount = allRoutes.filter((route) => Boolean(model.config?.[route.key]?.model)).length;

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "AI 路由配置" }]}
      description="AI / 路由矩阵"
      icon={Route}
      subtitle="业务层只选择 GPT 路线或豆包路线，失败和超时切换由底层自动处理。正文现在启用智能链：优先 xtokenmirror gpt-5.5，失败切 99dun gpt-5.5，再失败切豆包。"
      title="统一管理全站 AI 调用路线"
      userEmail={model.user?.email ?? ""}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="功能位" value={`${allRoutes.length}`} />
          <MetricPill label="逻辑路线" value={`${configuredRoutes}/${model.providers.length}`} />
          <MetricPill
            label="物理端点"
            value={`${configuredPhysical}/${model.physicalProviders.length}`}
          />
          <MetricPill label="模型覆盖" value={`${overrideCount}`} />
          <Button
            type="button"
            icon={RefreshCw}
            onClick={() => {
              if (window.confirm("确定要恢复默认配置吗？当前所有自定义模型覆盖会被清空。")) {
                model.setConfig(getDefaultAiModelConfig());
              }
            }}
            className="min-h-9 px-3"
          >
            恢复默认
          </Button>
          <Button
            type="button"
            icon={Save}
            onClick={model.handleSave}
            disabled={model.saving || !model.config}
            busy={model.saving}
            className="min-h-9 px-3"
          >
            {model.saving ? "保存中..." : "保存配置"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          {routeGroups.map((group) => (
            <RouteMatrixGroup key={group.title} group={group} model={model} />
          ))}
        </section>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <RouteStatusPanel providers={model.providers} />
          <PhysicalProviderPanel providers={model.physicalProviders} />
          <EnvReferencePanel providers={model.physicalProviders} />
        </aside>
      </div>
    </AdminWorkspaceShell>
  );
}

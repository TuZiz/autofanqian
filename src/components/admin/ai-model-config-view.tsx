"use client";

import Link from "next/link";
import { RefreshCw, Route, Save } from "lucide-react";

import { AppButton, AppCard } from "@/components/app-ui";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { getDefaultAiModelConfig } from "@/lib/admin/ai-model-utils";
import type { AiModelConfigController } from "@/lib/admin/use-ai-model-config";
import { allRoutes, routeGroups } from "./ai-model-config-data";
import { EnvReferencePanel, PhysicalProviderPanel, RouteStatusPanel } from "./ai-model-provider-panels";
import { MetricPill } from "./ai-model-config-shared";
import { RouteMatrixGroup } from "./ai-model-route-matrix";

type AiModelConfigViewProps = {
  model: AiModelConfigController;
};

export function AiModelConfigView({ model }: AiModelConfigViewProps) {
  const configuredRoutes = model.providers.filter((provider) => provider.configured).length;
  const configuredPhysical = model.physicalProviders.filter((provider) => provider.configured).length;
  const overrideCount = allRoutes.filter((route) => Boolean(model.config?.[route.key]?.model)).length;

  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />

      <DashboardTopbar
        className="relative z-40"
        title="AI 路由配置"
        userEmail={model.user?.email ?? ""}
        isAdmin={model.user?.isAdmin}
        showBackToDashboard
        backHref="/dashboard/admin"
        backLabel="返回管理台"
        showAdminLink={false}
        logoutLabel="退出"
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <AppCard className="bg-[var(--theme-surface-strong)] px-3 py-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 text-xs font-semibold text-stone-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200">
                  <Route className="h-3.5 w-3.5" />
                  路由矩阵
                </span>
                <MetricPill label="功能位" value={`${allRoutes.length}`} />
                <MetricPill label="逻辑路线" value={`${configuredRoutes}/${model.providers.length}`} />
                <MetricPill
                  label="物理端点"
                  value={`${configuredPhysical}/${model.physicalProviders.length}`}
                />
                <MetricPill label="模型覆盖" value={`${overrideCount}`} />
              </div>
              <h1 className="mt-2 text-xl font-extrabold leading-tight text-stone-950 dark:text-stone-50 md:text-2xl">
                统一管理全站 AI 调用路线
              </h1>
              <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-stone-600 dark:text-stone-400 sm:text-sm">
                业务层只选择 GPT 路线或豆包路线，失败和超时切换由底层自动处理。正文现在启用智能链：优先 xtokenmirror gpt-5.5，失败切 99dun gpt-5.5，再失败切豆包。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Link
                href="/dashboard/admin"
                className="theme-button-secondary inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold active:scale-95"
              >
                返回
              </Link>
              <AppButton
                type="button"
                onClick={() => {
                  if (window.confirm("确定要恢复默认配置吗？当前所有自定义模型覆盖会被清空。")) {
                    model.setConfig(getDefaultAiModelConfig());
                  }
                }}
                className="h-9 border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-primary)]"
              >
                <RefreshCw className="h-4 w-4" />
                恢复默认
              </AppButton>
              <AppButton
                type="button"
                onClick={model.handleSave}
                isDisabled={model.saving || !model.config}
                className="h-9 bg-zinc-950 px-4 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                <Save className="h-4 w-4" />
                {model.saving ? "保存中..." : "保存配置"}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
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
      </div>
    </main>
  );
}

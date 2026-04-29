"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  KeyRound,
  Layers3,
  ListChecks,
  PenLine,
  RefreshCw,
  Route,
  Save,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AiModelConfigKey, AiModelTarget, ProviderOption } from "@/lib/admin/ai-model-types";
import { apiKeyEnvName, getDefaultAiModelConfig, normalizeOverride } from "@/lib/admin/ai-model-utils";
import type { AiModelConfigController } from "@/lib/admin/use-ai-model-config";
import { cn } from "@/lib/utils";

type AiModelRoute = {
  api: string;
  defaultProvider: ProviderOption["id"];
  description: string;
  icon: LucideIcon;
  key: AiModelConfigKey;
  title: string;
};

type AiModelRouteGroup = {
  accentClass: string;
  description: string;
  routes: AiModelRoute[];
  title: string;
};

const defaultConfig = getDefaultAiModelConfig();

const routeGroups: AiModelRouteGroup[] = [
  {
    title: "创作入口",
    description: "作品创建页的创意生成、卖点分析和标题建议。",
    accentClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
    routes: [
      {
        key: "ideaGenerate",
        title: "生成创意",
        api: "/api/ai/idea",
        defaultProvider: "ark",
        icon: Sparkles,
        description: "从题材、标签、平台和参考风格生成完整创意稿。",
      },
      {
        key: "ideaAnalyze",
        title: "创意分析",
        api: "/api/ai/idea/analyze",
        defaultProvider: "primary",
        icon: ListChecks,
        description: "输出卖点、标题、关键词和目标读者。",
      },
    ],
  },
  {
    title: "大纲规划",
    description: "负责作品级结构、卷纲、章节范围和后续延伸。",
    accentClass:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
    routes: [
      {
        key: "outlineGenerate",
        title: "生成大纲",
        api: "/api/ai/outline",
        defaultProvider: "ark",
        icon: Layers3,
        description: "把创意扩展成全书大纲、卷结构、人物与总章数。",
      },
    ],
  },
  {
    title: "写作生产",
    description: "直接影响正文生成质量、节奏和连续写作稳定性。",
    accentClass:
      "border-slate-300 bg-slate-100 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-slate-100",
    routes: [
      {
        key: "chapterGenerate",
        title: "生成章节正文",
        api: "/api/ai/chapter",
        defaultProvider: "primary",
        icon: PenLine,
        description: "根据设定、大纲和上一章状态生成章节正文。",
      },
    ],
  },
  {
    title: "章节辅助",
    description: "写作页右侧工具：摘要、章纲和细节设定提取。",
    accentClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
    routes: [
      {
        key: "chapterSummary",
        title: "生成章节摘要",
        api: "/api/ai/chapter/summary",
        defaultProvider: "primary",
        icon: FileText,
        description: "读取正文后生成本章摘要，用于连续性和回顾。",
      },
      {
        key: "chapterOutline",
        title: "生成章节大纲",
        api: "/api/ai/chapter/outline",
        defaultProvider: "primary",
        icon: BookOpen,
        description: "从全书大纲或正文中整理本章写作大纲。",
      },
      {
        key: "chapterDetails",
        title: "提取细节设定",
        api: "/api/ai/chapter/details",
        defaultProvider: "primary",
        icon: KeyRound,
        description: "抽取人物、地点、道具、组织和规则，避免前后矛盾。",
      },
    ],
  },
  {
    title: "二次生成",
    description: "统一管理已有内容的重新生成、重写、延伸和优化。",
    accentClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-200",
    routes: [
      {
        key: "regenerateAll",
        title: "全部重新生成",
        api: "全局：已有内容二次生成",
        defaultProvider: "primary",
        icon: RefreshCw,
        description: "已有创意、已有章节、摘要、章纲、细节和大纲延伸统一走这里。",
      },
    ],
  },
  {
    title: "管理工具",
    description: "管理员专用的模板库学习和批量生成能力。",
    accentClass:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200",
    routes: [
      {
        key: "templatesLearn",
        title: "模板库学习生成",
        api: "/api/admin/templates/learn",
        defaultProvider: "primary",
        icon: Route,
        description: "根据近期创意和热门模板，生成新的预设模板内容。",
      },
    ],
  },
];

type AiModelConfigViewProps = {
  model: AiModelConfigController;
};

export function AiModelConfigView({ model }: AiModelConfigViewProps) {
  const configuredProviders = model.providers.filter((provider) => provider.configured).length;
  const routeCount = routeGroups.reduce((total, group) => total + group.routes.length, 0);
  const overrideCount = routeGroups
    .flatMap((group) => group.routes)
    .filter((route) => Boolean(model.config?.[route.key]?.model)).length;

  return (
    <main className="theme-page relative min-h-screen overflow-x-hidden pb-10 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />
      <div className="pointer-events-none fixed inset-0 theme-app-grid" />
      <div className="pointer-events-none fixed inset-0 theme-app-vignette" />
      <div className="pointer-events-none fixed inset-0 app-noise theme-app-noise" />

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
        maxWidthClassName="max-w-[1540px]"
      />

      <div className="relative z-10 mx-auto max-w-[1540px] px-4 pt-4 sm:px-5 lg:px-6">
        <section className="rounded-lg border border-slate-200 bg-white/78 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                  <Route className="h-3.5 w-3.5" />
                  AI Route Matrix
                </span>
                <MetricPill label="功能" value={`${routeCount}`} />
                <MetricPill label="线路" value={`${configuredProviders}/${model.providers.length}`} />
                <MetricPill label="覆盖" value={`${overrideCount}`} />
                <MetricPill label="模型源" value=".env.local" />
              </div>
              <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 dark:text-slate-50 md:text-3xl">
                按功能分配 AI 生成链路
              </h1>
              <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
                每个功能独立选择线路和模型；候选模型名从{" "}
                <span className="font-mono text-slate-900 dark:text-slate-200">web/.env.local</span>{" "}
                的 <span className="font-mono">*_MODEL_OPTIONS</span> 读取。二次生成统一由“全部重新生成”管理，后续新增功能直接加行，不再撑爆页面。
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin"
                className="theme-button-secondary inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-black active:scale-95"
              >
                返回
              </Link>
              <button
                type="button"
                onClick={() => model.setConfig(getDefaultAiModelConfig())}
                className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                恢复默认
              </button>
              <button
                type="button"
                onClick={model.handleSave}
                disabled={model.saving || !model.config}
                className="theme-button-primary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {model.saving ? "保存中..." : "保存配置"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-lg border border-slate-200 bg-white/76 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-0 divide-y divide-slate-100 dark:divide-white/10">
            {model.providers.map((provider) => (
              <ProviderStrip key={provider.id} provider={provider} />
            ))}
          </div>
        </section>

        <section className="mt-3 space-y-3">
          {routeGroups.map((group) => (
            <RouteMatrixGroup key={group.title} group={group} model={model} />
          ))}
        </section>
      </div>
    </main>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-slate-950 dark:text-slate-50">{value}</span>
    </span>
  );
}

function ProviderStrip({ provider }: { provider: ProviderOption }) {
  return (
    <article className="grid gap-3 p-3 md:grid-cols-[minmax(180px,0.7fr)_minmax(220px,1fr)_minmax(260px,1.2fr)] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">{provider.label}</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-black",
              provider.configured
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200",
            )}
          >
            {provider.configured ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {provider.configured ? "已配置密钥" : `缺少 ${provider.apiKeyEnvKey}`}
          </span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {provider.baseUrl}
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
          默认模型
        </div>
        <div className="mt-0.5 truncate font-mono text-xs font-black text-slate-800 dark:text-slate-100">
          {provider.envModelKey}={provider.model || "-"}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
            候选模型
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            {provider.prefer}
          </span>
        </div>
        <div className="flex min-h-7 flex-wrap gap-1">
          {provider.modelOptions.length ? (
            provider.modelOptions.map((option) => (
              <span
                key={option}
                className="max-w-[220px] truncate rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
              >
                {option}
              </span>
            ))
          ) : (
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
              未配置 *_MODEL_OPTIONS
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function RouteMatrixGroup({
  group,
  model,
}: {
  group: AiModelRouteGroup;
  model: AiModelConfigController;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/82 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-black", group.accentClass)}>
              {group.title}
            </span>
            <span className="text-xs font-black text-slate-400 dark:text-slate-500">
              {group.routes.length} 项
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {group.description}
          </p>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(240px,1.1fr)_minmax(230px,0.85fr)_minmax(260px,0.95fr)_minmax(160px,0.55fr)] border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] font-black uppercase text-slate-400 dark:border-white/10 dark:bg-white/[0.03] lg:grid">
        <span>功能 / 接口</span>
        <span>使用线路</span>
        <span>模型覆盖</span>
        <span>状态</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/10">
        {group.routes.map((route) => (
          <RouteMatrixRow key={route.key} model={model} route={route} />
        ))}
      </div>
    </section>
  );
}

function RouteMatrixRow({
  model,
  route,
}: {
  model: AiModelConfigController;
  route: AiModelRoute;
}) {
  const target = model.config?.[route.key] ?? defaultConfig[route.key];
  const provider = model.providers.find((item) => item.id === target.providerId);
  const modelOptions = getModelOptions(provider, target.model);
  const Icon = route.icon;

  return (
    <article className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(240px,1.1fr)_minmax(230px,0.85fr)_minmax(260px,0.95fr)_minmax(160px,0.55fr)] lg:items-center lg:gap-4 lg:py-2.5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">{route.title}</h3>
            {target.model ? (
              <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200">
                已覆盖
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500">
            {route.api}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-400">
            {route.description}
          </p>
        </div>
      </div>

      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-black text-slate-500 dark:text-slate-400 lg:hidden">
          使用线路
        </span>
        <select
          value={target.providerId}
          onChange={(event) => {
            const nextProviderId = (event.target.value || route.defaultProvider) as ProviderOption["id"];
            model.setConfig((prev) =>
              prev
                ? {
                    ...prev,
                    [route.key]: {
                      ...prev[route.key],
                      providerId: nextProviderId,
                      model: null,
                    },
                  }
                : prev,
            );
          }}
          className="theme-input h-9 w-full rounded-lg px-3 text-sm font-black"
        >
          {model.providers.map((providerOption) => (
            <option key={providerOption.id} value={providerOption.id}>
              {providerOption.label} ({providerOption.envModelKey}={providerOption.model || "-"})
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-black text-slate-500 dark:text-slate-400 lg:hidden">
          模型覆盖
        </span>
        <select
          value={target.model ?? ""}
          disabled={!provider}
          onChange={(event) => {
            const nextModel = normalizeOverride(event.target.value);
            updateRouteModel(model, route.key, nextModel);
          }}
          className="theme-input h-9 w-full rounded-lg px-3 font-mono text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {provider
              ? `使用 ${provider.envModelKey} 默认: ${provider.model || "-"}`
              : "使用当前线路默认模型"}
          </option>
          {modelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="flex min-w-0 items-center justify-between gap-2 lg:justify-start">
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-black",
            provider?.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200",
          )}
        >
          {provider?.configured ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <ShieldAlert className="h-3 w-3 shrink-0" />}
          <span className="truncate">
            {provider?.configured ? "可用" : `缺少 ${provider ? apiKeyEnvName(provider.id) : "API_KEY"}`}
          </span>
        </span>

        <button
          type="button"
          onClick={() => updateRouteModel(model, route.key, null)}
          disabled={!target.model}
          className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.06]"
        >
          清空
        </button>
      </div>
    </article>
  );
}

function getModelOptions(provider: ProviderOption | undefined, currentModel: string | null) {
  const options = provider?.modelOptions ?? [];
  const merged = currentModel ? [currentModel, ...options] : options;
  return Array.from(new Set(merged.filter(Boolean)));
}

function updateRouteModel(
  model: AiModelConfigController,
  key: AiModelConfigKey,
  nextModel: AiModelTarget["model"],
) {
  model.setConfig((prev) =>
    prev
      ? {
          ...prev,
          [key]: {
            ...prev[key],
            model: nextModel,
          },
        }
      : prev,
  );
}

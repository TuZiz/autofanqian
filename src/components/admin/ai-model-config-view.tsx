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
    description: "创意、卖点、标题和受众分析。",
    accentClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
    routes: [
      {
        key: "ideaGenerate",
        title: "生成创意",
        api: "/api/ai/idea",
        icon: Sparkles,
        description: "从题材、标签、平台和参考风格生成创意稿。",
      },
      {
        key: "ideaAnalyze",
        title: "创意分析",
        api: "/api/ai/idea/analyze",
        icon: ListChecks,
        description: "输出卖点、标题、关键词和目标读者。",
      },
    ],
  },
  {
    title: "大纲规划",
    description: "作品结构、卷纲和后续规划。",
    accentClass:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
    routes: [
      {
        key: "outlineGenerate",
        title: "生成大纲",
        api: "/api/ai/outline",
        icon: Layers3,
        description: "把创意扩展成全书大纲、卷结构和章节范围。",
      },
    ],
  },
  {
    title: "正文生产",
    description: "正文生成、润色和重写。",
    accentClass:
      "border-stone-300 bg-stone-100 text-stone-800 dark:border-white/15 dark:bg-white/10 dark:text-stone-100",
    routes: [
      {
        key: "chapterGenerate",
        title: "生成章节正文",
        api: "/api/ai/chapter",
        icon: PenLine,
        description: "根据设定、大纲和前文状态生成章节正文。",
      },
      {
        key: "chapterRewrite",
        title: "章节改写 / 润色",
        api: "/api/ai/chapter/rewrite",
        icon: RefreshCw,
        description: "写作页里的润色、扩写、压缩、冲突检查。",
      },
    ],
  },
  {
    title: "章节辅助",
    description: "摘要、章节纲要和细节设定提取。",
    accentClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
    routes: [
      {
        key: "chapterSummary",
        title: "生成章节摘要",
        api: "/api/ai/chapter/summary",
        icon: FileText,
        description: "读正文后生成本章摘要，用于连续性回顾。",
      },
      {
        key: "chapterOutline",
        title: "生成章节大纲",
        api: "/api/ai/chapter/outline",
        icon: BookOpen,
        description: "从全书大纲或正文整理本章写作大纲。",
      },
      {
        key: "chapterDetails",
        title: "提取细节设定",
        api: "/api/ai/chapter/details",
        icon: KeyRound,
        description: "抽取人物、地点、道具、组织和规则。",
      },
    ],
  },
  {
    title: "二次生成",
    description: "已有内容的重新生成和统一优化。",
    accentClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-200",
    routes: [
      {
        key: "regenerateAll",
        title: "全部重新生成",
        api: "全局：已有内容二次生成",
        icon: RefreshCw,
        description: "创意、章节、摘要、章节纲、细节和延展统一走这里。",
      },
    ],
  },
  {
    title: "管理工具",
    description: "管理员专用的模板学习能力。",
    accentClass:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-200",
    routes: [
      {
        key: "templatesLearn",
        title: "模板库学习生成",
        api: "/api/admin/templates/learn",
        icon: Route,
        description: "根据近期创意和热门模板生成新的预设模板内容。",
      },
    ],
  },
];

const allRoutes = routeGroups.flatMap((group) => group.routes);

type AiModelConfigViewProps = {
  model: AiModelConfigController;
};

export function AiModelConfigView({ model }: AiModelConfigViewProps) {
  const configuredProviders = model.providers.filter((provider) => provider.configured).length;
  const overrideCount = allRoutes.filter((route) => Boolean(model.config?.[route.key]?.model)).length;

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
        <section className="rounded-lg border border-stone-200 bg-white/82 px-3 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 text-xs font-black text-stone-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200">
                  <Route className="h-3.5 w-3.5" />
                  Route Matrix
                </span>
                <MetricPill label="功能" value={`${allRoutes.length}`} />
                <MetricPill label="线路" value={`${configuredProviders}/${model.providers.length}`} />
                <MetricPill label="覆盖" value={`${overrideCount}`} />
                <MetricPill label="协议" value="OpenAI / Anthropic" />
              </div>
              <h1 className="mt-2 text-xl font-black leading-tight text-stone-950 dark:text-stone-50 md:text-2xl">
                按功能切换 AI 线路和模型
              </h1>
              <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-stone-600 dark:text-stone-400 sm:text-sm">
                左侧维护功能路由，右侧查看环境线路。新增功能时只需要继续加入矩阵行，不会把页面撑成大表单。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Link
                href="/dashboard/admin"
                className="theme-button-secondary inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-black active:scale-95"
              >
                返回
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("确定要恢复默认配置吗？当前所有自定义配置将丢失。")) model.setConfig(getDefaultAiModelConfig());
                }}
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

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3">
            {routeGroups.map((group) => (
              <RouteMatrixGroup key={group.title} group={group} model={model} />
            ))}
          </section>

          <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
            <ProviderStatusPanel providers={model.providers} />
            <EnvReferencePanel providers={model.providers} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-black text-stone-600 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="text-stone-950 dark:text-stone-50">{value}</span>
    </span>
  );
}

function ProviderStatusPanel({ providers }: { providers: ProviderOption[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white/82 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2.5 dark:border-white/10">
        <div>
          <h2 className="text-sm font-black text-stone-950 dark:text-stone-50">线路状态</h2>
          <p className="mt-0.5 text-[11px] font-bold text-stone-500 dark:text-stone-400">
            env 决定可用线路，矩阵决定功能走向
          </p>
        </div>
        <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-black text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
          {providers.filter((provider) => provider.configured).length}/{providers.length}
        </span>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-white/10">
        {providers.map((provider) => (
          <ProviderRow key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  );
}

function ProviderRow({ provider }: { provider: ProviderOption }) {
  const modelOptions = provider.modelOptions.slice(0, 2);
  const hiddenOptions = Math.max(0, provider.modelOptions.length - modelOptions.length);

  return (
    <article className="px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-black text-stone-950 dark:text-stone-50">
              {provider.label}
            </h3>
            <span className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-black text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
              {protocolLabel(provider.prefer)}
            </span>
          </div>
          <p
            title={provider.baseUrl}
            className="mt-1 truncate font-mono text-[11px] font-bold text-stone-500 dark:text-stone-400"
          >
            {provider.baseUrl}
          </p>
        </div>

        <StatusBadge configured={provider.configured} label={provider.configured ? "可用" : `缺少 ${provider.apiKeyEnvKey}`} />
      </div>

      <div className="mt-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase text-stone-500 dark:text-stone-400">
            默认模型
          </span>
          <span className="font-mono text-[10px] font-black text-stone-500 dark:text-stone-400">
            {provider.envModelKey}
          </span>
        </div>
        <p
          title={provider.model}
          className="mt-1 truncate font-mono text-xs font-black text-stone-800 dark:text-stone-100"
        >
          {provider.model || "-"}
        </p>
      </div>

      <div className="mt-2 flex min-h-7 flex-wrap gap-1">
        {modelOptions.length ? (
          modelOptions.map((option) => (
            <span
              key={option}
              title={option}
              className="max-w-[145px] truncate rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-[11px] font-bold text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300"
            >
              {option}
            </span>
          ))
        ) : (
          <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-500 dark:border-white/10 dark:bg-white/[0.03]">
            未配置候选模型
          </span>
        )}
        {hiddenOptions ? (
          <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-black text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
            +{hiddenOptions}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function EnvReferencePanel({ providers }: { providers: ProviderOption[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white/76 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="border-b border-stone-100 px-3 py-2.5 dark:border-white/10">
        <h2 className="text-sm font-black text-stone-950 dark:text-stone-50">环境键</h2>
      </div>
      <div className="divide-y divide-stone-100 dark:divide-white/10">
        {providers.map((provider) => (
          <div key={provider.id} className="grid gap-1 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-stone-700 dark:text-stone-200">{provider.label}</span>
              <span className="font-mono text-[10px] font-black text-stone-500 dark:text-stone-400">
                {provider.prefer}
              </span>
            </div>
            <p className="truncate font-mono font-bold text-stone-500 dark:text-stone-400">
              {apiKeyEnvName(provider.id)} / {provider.envModelKey}
            </p>
          </div>
        ))}
        <div className="px-3 py-2.5">
          <p className="font-mono text-[11px] font-bold leading-5 text-stone-500 dark:text-stone-400">
            ANTHROPIC_BASE_URL 可填 https://token-plan-cn.xiaomimimo.com/anthropic
          </p>
        </div>
      </div>
    </section>
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
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white/82 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid gap-2 border-b border-stone-100 px-3 py-2.5 dark:border-white/10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-black", group.accentClass)}>
              {group.title}
            </span>
            <span className="text-xs font-black text-stone-500 dark:text-stone-400">
              {group.routes.length} 项
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-stone-600 dark:text-stone-400">
            {group.description}
          </p>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(230px,1.1fr)_minmax(170px,0.75fr)_minmax(230px,0.95fr)_minmax(130px,0.5fr)] border-b border-stone-100 bg-stone-50/80 px-3 py-2 text-[11px] font-black uppercase text-stone-500 dark:border-white/10 dark:bg-white/[0.03] lg:grid">
        <span>功能 / 接口</span>
        <span>线路</span>
        <span>模型覆盖</span>
        <span>状态</span>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-white/10">
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
    <article className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(230px,1.1fr)_minmax(170px,0.75fr)_minmax(230px,0.95fr)_minmax(130px,0.5fr)] lg:items-center lg:gap-4 lg:py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-stone-950 dark:text-stone-50">{route.title}</h3>
            {target.model ? (
              <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200">
                已覆盖
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-stone-500 dark:text-stone-400">
            {route.api}
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-stone-600 dark:text-stone-400">
            {route.description}
          </p>
        </div>
      </div>

      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-black text-stone-500 dark:text-stone-400 lg:hidden">
          线路
        </span>
        <select
          value={target.providerId}
          onChange={(event) => {
            const nextProviderId = (event.target.value || defaultConfig[route.key].providerId) as ProviderOption["id"];
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
              {providerOption.label} · {providerOption.model || "-"}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-black text-stone-500 dark:text-stone-400 lg:hidden">
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
              ? `默认 ${provider.envModelKey}: ${provider.model || "-"}`
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
        <StatusBadge
          configured={Boolean(provider?.configured)}
          label={provider?.configured ? "可用" : `缺少 ${provider ? apiKeyEnvName(provider.id) : "API_KEY"}`}
        />

        <button
          type="button"
          onClick={() => updateRouteModel(model, route.key, null)}
          disabled={!target.model}
          className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-[11px] font-black text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400 dark:hover:bg-white/[0.06]"
        >
          清空
        </button>
      </div>
    </article>
  );
}

function StatusBadge({
  configured,
  label,
}: {
  configured: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-black",
        configured
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-200",
      )}
    >
      {configured ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <ShieldAlert className="h-3 w-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );
}

function protocolLabel(protocol: ProviderOption["prefer"]) {
  if (protocol === "anthropic") return "Messages";
  if (protocol === "responses") return "Responses";
  return "Chat";
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

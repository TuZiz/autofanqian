import type {
  AiModelConfigKey,
  AiModelTarget,
  ProviderOption,
} from "@/lib/admin/ai-model-types";
import {
  apiKeyEnvName,
  getDefaultAiModelConfig,
  normalizeOverride,
} from "@/lib/admin/ai-model-utils";
import type { AiModelConfigController } from "@/lib/admin/use-ai-model-config";
import { cn } from "@/lib/utils";
import type { AiModelRoute, AiModelRouteGroup } from "./ai-model-config-data";
import { StatusBadge } from "./ai-model-config-shared";

const defaultConfig = getDefaultAiModelConfig();

export function RouteMatrixGroup({
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
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
                group.accentClass,
              )}
            >
              {group.title}
            </span>
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
              {group.routes.length} 项
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-stone-600 dark:text-stone-400">
            {group.description}
          </p>
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(230px,1.1fr)_minmax(210px,0.9fr)_minmax(230px,0.95fr)_minmax(130px,0.5fr)] border-b border-stone-100 bg-stone-50/80 px-3 py-2 text-[11px] font-semibold uppercase text-stone-500 dark:border-white/10 dark:bg-white/[0.03] lg:grid">
        <span>功能 / 接口</span>
        <span>逻辑路线</span>
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
    <article className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(230px,1.1fr)_minmax(210px,0.9fr)_minmax(230px,0.95fr)_minmax(130px,0.5fr)] lg:items-center lg:gap-4 lg:py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-stone-950 dark:text-stone-50">
              {route.title}
            </h3>
            {target.model ? (
              <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200">
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
        <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400 lg:hidden">
          逻辑路线
        </span>
        <select
          value={target.providerId}
          onChange={(event) => {
            const nextProviderId = (
              event.target.value || defaultConfig[route.key].providerId
            ) as ProviderOption["id"];
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
          className="theme-input h-9 w-full rounded-lg px-3 text-sm font-medium"
        >
          {model.providers.map((providerOption) => (
            <option key={providerOption.id} value={providerOption.id}>
              {providerOption.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-bold text-stone-500 dark:text-stone-400 lg:hidden">
          模型覆盖
        </span>
        <select
          value={target.model ?? ""}
          disabled={!provider}
          onChange={(event) => {
            const nextModel = normalizeOverride(event.target.value);
            updateRouteModel(model, route.key, nextModel);
          }}
          className="theme-input h-9 w-full rounded-lg px-3 font-mono text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {provider ? `默认 ${provider.model || "-"}` : "使用路线头部模型"}
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
          label={
            provider?.configured
              ? "可用"
              : `缺少 ${provider ? apiKeyEnvName(provider.id) : "API_KEY"}`
          }
        />

        <button
          type="button"
          onClick={() => updateRouteModel(model, route.key, null)}
          disabled={!target.model}
          className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400 dark:hover:bg-white/[0.06]"
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

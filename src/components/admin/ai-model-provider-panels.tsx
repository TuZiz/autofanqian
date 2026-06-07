import { Server } from "lucide-react";

import type {
  PhysicalProviderOption,
  ProviderOption,
} from "@/lib/admin/ai-model-types";
import { StatusBadge } from "./ai-model-config-shared";

export function RouteStatusPanel({ providers }: { providers: ProviderOption[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] px-3 py-2.5">
        <div>
          <h2 className="text-sm font-bold text-[var(--theme-text-strong)]">逻辑路线状态</h2>
          <p className="mt-0.5 text-[11px] font-bold text-[var(--theme-text-muted)]">
            后台只对功能暴露两条路线。正文功能会在 GPT 路线内部先做微探针，再自动选择 xtokenmirror / 99dun / 豆包。
          </p>
        </div>
        <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2 py-1 text-[11px] font-semibold text-[var(--theme-text-muted)]">
          {providers.filter((provider) => provider.configured).length}/{providers.length}
        </span>
      </div>

      <div className="divide-y divide-[var(--theme-border)]">
        {providers.map((provider) => (
          <article key={provider.id} className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-[var(--theme-text-strong)]">
                    {provider.label}
                  </h3>
                  <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text-muted)]">
                    逻辑路由
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[var(--theme-text-muted)]">
                  {provider.id === "gpt"
                    ? "正文智能链：xtokenmirror(gpt-5.5) -> 99dun(gpt-5.5) -> 豆包；其他 GPT 类功能仍按逻辑路线走。"
                    : provider.routeChain.join(" -> ")}
                </p>
              </div>
              <StatusBadge
                configured={provider.configured}
                label={
                  provider.configured
                    ? "可用"
                    : `缺少 ${provider.envSummary.join(" / ")}`
                }
              />
            </div>

            <div className="mt-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-[var(--theme-text-muted)]">
                  头部默认模型
                </span>
                <span className="font-mono text-[10px] font-bold text-[var(--theme-text-muted)]">
                  {provider.envSummary[0] ?? "-"}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs font-bold text-[var(--theme-text-strong)]">
                {provider.id === "gpt" ? "gpt-5.5（正文智能链默认）" : provider.model || "-"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhysicalProviderPanel({ providers }: { providers: PhysicalProviderOption[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] px-3 py-2.5">
        <div>
          <h2 className="text-sm font-bold text-[var(--theme-text-strong)]">物理端点面板</h2>
          <p className="mt-0.5 text-[11px] font-bold text-[var(--theme-text-muted)]">
            这里展示真实 API 端点状态，不作为后台逐功能选择项。
          </p>
        </div>
        <Server className="h-4 w-4 text-[var(--theme-text-muted)]" />
      </div>

      <div className="divide-y divide-[var(--theme-border)]">
        {providers.map((provider) => (
          <article key={provider.id} className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-[var(--theme-text-strong)]">
                    {provider.label}
                  </h3>
                  <span className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text-muted)]">
                    {protocolLabel(provider.prefer)}
                  </span>
                </div>
                <p
                  title={provider.baseUrl}
                  className="mt-1 truncate font-mono text-[11px] font-bold text-[var(--theme-text-muted)]"
                >
                  {provider.baseUrl}
                </p>
              </div>

              <StatusBadge
                configured={provider.configured}
                label={provider.configured ? "可用" : `缺少 ${provider.apiKeyEnvKey}`}
              />
            </div>

            <div className="mt-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-[var(--theme-text-muted)]">
                  默认模型
                </span>
                <span className="font-mono text-[10px] font-bold text-[var(--theme-text-muted)]">
                  {provider.envModelKey}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-xs font-bold text-[var(--theme-text-strong)]">
                {provider.model || "-"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EnvReferencePanel({ providers }: { providers: PhysicalProviderOption[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] shadow-sm backdrop-blur">
      <div className="border-b border-[var(--theme-border)] px-3 py-2.5">
        <h2 className="text-sm font-bold text-[var(--theme-text-strong)]">环境变量参考</h2>
      </div>
      <div className="divide-y divide-[var(--theme-border)]">
        {providers.map((provider) => (
          <div key={provider.id} className="grid gap-1 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[var(--theme-text-secondary)]">
                {provider.label}
              </span>
              <span className="font-mono text-[10px] font-bold text-[var(--theme-text-muted)]">
                {provider.id}
              </span>
            </div>
            <p className="truncate font-mono font-bold text-[var(--theme-text-muted)]">
              {provider.apiKeyEnvKey} / {provider.envModelKey}
            </p>
            <p className="truncate font-mono text-[11px] font-semibold text-[var(--theme-text-muted)]">
              {provider.baseUrl}
            </p>
          </div>
        ))}
        <div className="px-3 py-2.5">
          <p className="text-[11px] font-semibold leading-5 text-[var(--theme-text-muted)]">
            兼容期内，如果未配置 `GPT_PRIMARY_*`，系统会临时回退读取旧 `AI_*` 变量作为主 GPT 端点。
          </p>
        </div>
      </div>
    </section>
  );
}

function protocolLabel(protocol: PhysicalProviderOption["prefer"]) {
  if (protocol === "responses") return "响应式";
  return "聊天";
}

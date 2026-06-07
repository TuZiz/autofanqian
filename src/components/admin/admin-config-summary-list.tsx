import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/design-system";
import {
  getUsageHint,
  type ConfigModule,
  type ConfigModuleKey,
} from "@/components/admin/admin-config-model";
import { AdminEmptyStateCard, AdminStatusPill } from "@/components/admin/admin-console-primitives";
import type { CreateUiConfig, GenreConfig, OptionConfig } from "@/lib/admin/dashboard-admin-types";
import { cn } from "@/lib/utils";

type SummaryListProps = {
  config: CreateUiConfig;
  items: Array<GenreConfig | OptionConfig>;
  module: ConfigModule;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string;
};

export function SummaryList({
  config,
  items,
  module,
  onDelete,
  onSelect,
  selectedId,
}: SummaryListProps) {
  return (
    <section className="rounded-[24px] border border-[var(--theme-border)] bg-[rgba(255,255,255,0.82)] shadow-[var(--theme-shadow-card)]">
      <div className="border-b border-[var(--theme-divider)] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-[var(--theme-text-strong)]">{module.title}</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
              {module.description}
            </p>
          </div>
          <AdminStatusPill tone="neutral">{items.length} 项</AdminStatusPill>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {items.length ? (
          items.map((item) => (
            <SummaryRow
              key={item.id}
              config={config}
              item={item}
              moduleKey={module.key}
              onDelete={onDelete}
              onSelect={onSelect}
              selected={item.id === selectedId}
            />
          ))
        ) : (
          <AdminEmptyStateCard
            title={`当前模块暂无${module.title}配置`}
            description="先新增一个配置项，再在右侧编辑区继续补全字段、排序和启用状态。"
          />
        )}
      </div>
    </section>
  );
}

type SummaryRowProps = {
  config: CreateUiConfig;
  item: GenreConfig | OptionConfig;
  moduleKey: ConfigModuleKey;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selected: boolean;
};

function SummaryRow({
  config,
  item,
  moduleKey,
  onDelete,
  onSelect,
  selected,
}: SummaryRowProps) {
  const isGenre = moduleKey === "genres";
  const genre = isGenre ? (item as GenreConfig) : null;
  const option = isGenre ? null : (item as OptionConfig);
  const title = isGenre ? genre!.name : option!.label;
  const subtitle = isGenre
    ? `${genre!.tags.length || 0} 个标签 · ${genre!.gradient || "未设置渐变"}`
    : option!.promptHint
      ? option!.promptHint
      : "未填写提示词注入规则";
  const usage = getUsageHint(config, moduleKey, item.id);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[22px] border p-4 transition",
        selected
          ? "border-[var(--theme-brand-border)] bg-[linear-gradient(180deg,rgba(56,174,234,0.12),rgba(255,255,255,0.96))] shadow-[var(--theme-shadow-card)]"
          : "border-[var(--theme-border)] bg-[rgba(255,255,255,0.92)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-surface-hover)]",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-4 left-0 w-1 rounded-r-full transition",
          selected ? "bg-[var(--theme-brand-500)]" : "bg-transparent group-hover:bg-[var(--theme-brand-border)]",
        )}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          className="min-w-0 flex-1 pl-2 text-left"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border text-sm font-black",
                selected
                  ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-secondary)]",
              )}
            >
              {isGenre ? genre!.icon || "?" : title.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-black text-[var(--theme-text-strong)]">{title}</span>
                <span className="rounded-full border border-[var(--theme-border)] bg-[rgba(255,255,255,0.76)] px-2 py-1 font-mono text-[10px] font-bold text-[var(--theme-text-muted)]">
                  {item.id}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-6 text-[var(--theme-text-secondary)]">
                {subtitle}
              </p>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <AdminStatusPill tone={item.active ? "success" : "neutral"}>
            {item.active ? "启用中" : "已停用"}
          </AdminStatusPill>
          <AdminStatusPill tone="neutral">排序 {item.sortOrder}</AdminStatusPill>
          {usage ? <AdminStatusPill tone="warning">{usage}</AdminStatusPill> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" icon={Pencil} onClick={() => onSelect(item.id)} className="min-h-9 px-3">
          编辑
        </Button>
        <Button
          type="button"
          tone="danger"
          icon={Trash2}
          onClick={() => {
            if (window.confirm("确定要删除这个配置项吗？")) onDelete(item.id);
          }}
          className="min-h-9 px-3"
        >
          删除
        </Button>
      </div>
    </article>
  );
}

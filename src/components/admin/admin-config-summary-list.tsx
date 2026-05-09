import { Pencil, Trash2 } from "lucide-react";

import {
  getUsageHint,
  type ConfigModule,
  type ConfigModuleKey,
} from "@/components/admin/admin-config-model";
import type {
  CreateUiConfig,
  GenreConfig,
  OptionConfig,
} from "@/lib/admin/dashboard-admin-types";
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
    <section className="min-w-0 border-b border-stone-100 dark:border-white/10 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-stone-950 dark:text-stone-50">
            {module.title}
          </h3>
          <p className="truncate text-xs font-semibold text-stone-500 dark:text-stone-400">
            {module.description}
          </p>
        </div>
        <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300">
          {items.length} 项
        </span>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-white/10">
        {items.map((item) => (
          <SummaryRow
            key={item.id}
            config={config}
            item={item}
            moduleKey={module.key}
            onDelete={onDelete}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
        {!items.length ? (
          <div className="p-8 text-center text-sm font-bold text-stone-500">
            当前模块暂无配置项
          </div>
        ) : null}
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
    ? `${genre!.tags.length || 0} 个标签 · ${genre!.gradient || "未设渐变"}`
    : option!.promptHint
      ? option!.promptHint
      : "未填写提示词注入规则";
  const usage = getUsageHint(config, moduleKey, item.id);

  return (
    <article
      className={cn(
        "grid gap-3 px-4 py-3 transition lg:grid-cols-[minmax(0,1fr)_150px_106px] lg:items-center",
        selected ? "bg-emerald-50/70 dark:bg-emerald-400/10" : "bg-white dark:bg-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          {isGenre ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-sm font-bold dark:border-white/10 dark:bg-white/[0.04]">
              {genre!.icon || "?"}
            </span>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-bold text-stone-950 dark:text-stone-50">
                {title}
              </span>
              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-500 dark:bg-white/[0.08] dark:text-stone-400">
                {item.id}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
              {subtitle}
            </p>
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span
          className={cn(
            "rounded-md border px-2 py-1",
            item.active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200"
              : "border-stone-200 bg-stone-50 text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400",
          )}
        >
          {item.active ? "启用" : "停用"}
        </span>
        <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
          排序 {item.sortOrder}
        </span>
        {usage ? (
          <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
            {usage}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          className="theme-button-secondary inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold active:scale-95"
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("确定要删除该配置项吗？")) onDelete(item.id);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
